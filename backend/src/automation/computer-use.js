/**
 * Computer-Use agent — Google's Gemini 2.5 Computer Use model (on Vertex AI)
 * drives a real browser to complete a goal, instead of hardcoded selectors.
 *
 * This is Curate's differentiator: the AI *looks* at the page (screenshots) and
 * decides where to click / what to type, navigating arbitrary signup/cancel
 * flows. Verified available on Vertex (region `global`) with no quota wall,
 * where the Anthropic-MaaS models are quota-blocked.
 *
 * Loop: screenshot → model returns a UI action (functionCall) → we execute it in
 * Playwright → screenshot → feed back as functionResponse → repeat. Each step's
 * reasoning + screenshot streams into the run registry for the live filmstrip.
 *
 * Coordinates from the model are normalized to [0,1000); we scale to viewport px.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { GoogleAuth } = require('google-auth-library');
const { pushStep, pushFrame, finishRun } = require('./runs');

// On hosts without gcloud ADC (e.g. Render), accept the Vertex service-account
// key as an env var (GOOGLE_CREDENTIALS_JSON) and write it to a file that
// google-auth-library picks up. If GOOGLE_APPLICATION_CREDENTIALS already points
// at a key (e.g. a Render Secret File), that's used as-is.
function ensureGoogleCreds() {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) return;
  const json = process.env.GOOGLE_CREDENTIALS_JSON;
  if (!json) return;
  try {
    const file = path.join(os.tmpdir(), 'curate-vertex-sa.json');
    fs.writeFileSync(file, json);
    process.env.GOOGLE_APPLICATION_CREDENTIALS = file;
  } catch (err) {
    console.error('[computer-use] failed to write service-account key:', err.message);
  }
}
ensureGoogleCreds();

const PROJECT = process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
const REGION = process.env.COMPUTER_USE_REGION || 'global';
const MODEL = process.env.COMPUTER_USE_MODEL || 'gemini-2.5-computer-use-preview-10-2025';
const VIEWPORT = { width: 1280, height: 800 };

const auth = new GoogleAuth({ scopes: 'https://www.googleapis.com/auth/cloud-platform' });

function loadChromium() {
  for (const pkg of ['playwright-core', 'playwright']) {
    try { return require(pkg).chromium; } catch { /* try next */ }
  }
  return null;
}

function endpoint() {
  const host = REGION === 'global' ? 'aiplatform.googleapis.com' : `${REGION}-aiplatform.googleapis.com`;
  return `https://${host}/v1/projects/${PROJECT}/locations/${REGION}/publishers/google/models/${MODEL}:generateContent`;
}

async function generate(contents, token) {
  const res = await fetch(endpoint(), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents, tools: [{ computerUse: { environment: 'ENVIRONMENT_BROWSER' } }] }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${json.error?.message || 'request failed'}`);
  return json.candidates?.[0]?.content?.parts || [];
}

// Scale a model coordinate (0..1000) to a viewport pixel.
const px = (v, dim) => Math.round((Number(v) / 1000) * dim);

// Execute one model action against the page. Returns a short label for the frame.
async function executeAction(page, name, args) {
  const a = args || {};
  switch (name) {
    case 'open_web_browser':
      return 'open browser';
    case 'navigate':
    case 'navigate_to':
      await page.goto(a.url, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
      return `navigate ${a.url}`;
    case 'click_at':
      await page.mouse.click(px(a.x, VIEWPORT.width), px(a.y, VIEWPORT.height));
      return `click (${a.x},${a.y})`;
    case 'hover_at':
      await page.mouse.move(px(a.x, VIEWPORT.width), px(a.y, VIEWPORT.height));
      return `hover (${a.x},${a.y})`;
    case 'type_text_at': {
      const x = px(a.x, VIEWPORT.width), y = px(a.y, VIEWPORT.height);
      await page.mouse.click(x, y);
      if (a.clear_before_typing !== false) {
        await page.keyboard.press('ControlOrMeta+A').catch(() => {});
        await page.keyboard.press('Delete').catch(() => {});
      }
      await page.keyboard.type(String(a.text ?? ''), { delay: 30 });
      if (a.press_enter) await page.keyboard.press('Enter');
      return `type "${String(a.text ?? '').slice(0, 30)}"`;
    }
    case 'key_combination':
    case 'key_press': {
      const keys = (a.keys || a.key || '').toString().split('+').map((k) => k.trim()).filter(Boolean).join('+');
      if (keys) await page.keyboard.press(keys).catch(() => {});
      return `key ${keys}`;
    }
    case 'scroll_document': {
      const dir = (a.direction || 'down').toLowerCase();
      await page.mouse.wheel(0, dir === 'up' ? -700 : 700);
      return `scroll ${dir}`;
    }
    case 'scroll_at': {
      const dir = (a.direction || 'down').toLowerCase();
      const mag = Number(a.magnitude) || 700;
      await page.mouse.move(px(a.x, VIEWPORT.width), px(a.y, VIEWPORT.height));
      await page.mouse.wheel(0, dir === 'up' ? -mag : mag);
      return `scroll ${dir} @(${a.x},${a.y})`;
    }
    case 'go_back':
      await page.goBack().catch(() => {});
      return 'go back';
    case 'go_forward':
      await page.goForward().catch(() => {});
      return 'go forward';
    case 'wait_5_seconds':
    case 'wait':
      await page.waitForTimeout(Math.min(Number(a.seconds) * 1000 || 3000, 5000));
      return 'wait';
    case 'drag_and_drop':
      await page.mouse.move(px(a.x, VIEWPORT.width), px(a.y, VIEWPORT.height));
      await page.mouse.down();
      await page.mouse.move(px(a.destination_x, VIEWPORT.width), px(a.destination_y, VIEWPORT.height));
      await page.mouse.up();
      return 'drag & drop';
    default:
      return `unhandled:${name}`;
  }
}

/**
 * Run the agent until the model stops issuing actions, the step cap is hit, or
 * an error occurs. Streams reasoning + screenshots into `run`.
 */
async function runComputerUse({ run, goal, startUrl, maxSteps = 18 }) {
  if (!PROJECT) {
    finishRun(run, { error: new Error('GCP_PROJECT_ID not set — computer-use needs Vertex') });
    return;
  }
  const chromium = loadChromium();
  if (!chromium) {
    finishRun(run, { error: new Error('Chromium not available for Playwright') });
    return;
  }

  // Remote browser (e.g. Browserbase) when BROWSER_WS_ENDPOINT is set — so a
  // host that can't run Chromium (Render free) still drives a real browser.
  // Otherwise launch locally (headed for the live demo).
  const ws = process.env.BROWSER_WS_ENDPOINT;
  const remote = Boolean(ws);
  const headless = process.env.AUTOMATION_HEADLESS !== 'false';
  const slowMo = Number(process.env.BROWSER_SLOWMO) || 0;
  const browser = remote
    ? (process.env.BROWSER_CDP === 'false' ? await chromium.connect(ws) : await chromium.connectOverCDP(ws))
    : await chromium.launch({
        headless, slowMo,
        args: ['--disable-blink-features=AutomationControlled', '--no-sandbox', '--disable-setuid-sandbox'],
      });

  try {
    const token = await auth.getAccessToken();
    // Reuse the remote browser's default context; create a fresh one locally.
    const context = remote
      ? (browser.contexts()[0] || await browser.newContext({ viewport: VIEWPORT }))
      : await browser.newContext({
          viewport: VIEWPORT,
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        });
    const page = context.pages()[0] || await context.newPage();
    if (remote) await page.setViewportSize(VIEWPORT).catch(() => {});
    await page.goto(startUrl, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});

    // Resilient screenshot: pages often navigate between actions, which can make
    // a single capture protocol-error. Retry briefly before giving up.
    const shot = async () => {
      for (let i = 0; i < 3; i++) {
        try {
          return (await page.screenshot({ timeout: 15000 })).toString('base64');
        } catch (err) {
          if (i === 2) throw err;
          await page.waitForLoadState('domcontentloaded', { timeout: 3000 }).catch(() => {});
          await page.waitForTimeout(600);
        }
      }
      return '';
    };
    let screenshot = await shot();
    pushStep(run, `Goal: ${goal}`);
    pushFrame(run, Buffer.from(screenshot, 'base64'), 'start');

    // Conversation history grows each turn (model is stateful via context).
    const contents = [{
      role: 'user',
      parts: [
        { text: `${goal}\nThe browser viewport is ${VIEWPORT.width}x${VIEWPORT.height}. You are already on ${startUrl}.` },
        { inlineData: { mimeType: 'image/png', data: screenshot } },
      ],
    }];

    for (let step = 0; step < maxSteps; step++) {
      const parts = await generate(contents, token);
      contents.push({ role: 'model', parts });

      const reasoning = parts.filter((p) => p.text).map((p) => p.text).join(' ').trim();
      const call = parts.find((p) => p.functionCall)?.functionCall;

      if (reasoning) pushStep(run, reasoning.slice(0, 240));

      // No action → the model considers the task done (or is just narrating).
      if (!call) {
        finishRun(run, { result: { ok: true, message: reasoning || 'Agent finished.', steps_taken: step } });
        return;
      }

      const label = await executeAction(page, call.name, call.args);
      await page.waitForTimeout(700); // let the UI settle before the next shot
      screenshot = await shot();
      pushFrame(run, Buffer.from(screenshot, 'base64'), `${label}${reasoning ? ' — ' + reasoning.slice(0, 60) : ''}`);

      // Feed the new page state back as the function's result.
      contents.push({
        role: 'user',
        parts: [{
          functionResponse: {
            name: call.name,
            response: { url: page.url() },
            parts: [{ inlineData: { mimeType: 'image/png', data: screenshot } }],
          },
        }],
      });
    }

    finishRun(run, { result: { ok: true, message: `Reached step cap (${maxSteps}).`, steps_taken: maxSteps } });
  } catch (err) {
    pushStep(run, `Error: ${err.message}`);
    finishRun(run, { error: err });
  } finally {
    await browser.close().catch(() => {});
  }
}

module.exports = { runComputerUse };
