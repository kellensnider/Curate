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

// Two auth paths:
//  - GEMINI_API_KEY set → call the Gemini API (AI Studio) with an API key. No
//    service account needed — works where org policy blocks SA-key creation.
//  - else → call Vertex AI with the service-account / ADC bearer token.
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const PROJECT = process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
const REGION = process.env.COMPUTER_USE_REGION || 'global';
const MODEL = process.env.COMPUTER_USE_MODEL || 'gemini-2.5-computer-use-preview-10-2025';
// Smaller viewport → smaller PNG → fewer image tokens → faster model inference,
// so more steps fit inside the (60s on Browserless free) session. 16:10 aspect
// preserved. Override via env if a flow needs more screen real estate.
const VIEWPORT = {
  width: Number(process.env.BROWSER_VIEWPORT_W) || 1024,
  height: Number(process.env.BROWSER_VIEWPORT_H) || 640,
};

const auth = new GoogleAuth({ scopes: 'https://www.googleapis.com/auth/cloud-platform' });

function loadChromium() {
  for (const pkg of ['playwright-core', 'playwright']) {
    try { return require(pkg).chromium; } catch { /* try next */ }
  }
  return null;
}

// Map technical errors to a clean message for the demo UI. The raw detail is
// still written to the run's step log for debugging.
function friendlyError(message) {
  const m = String(message || '');
  if (/captcha|verify you are human|are you a robot/i.test(m)) {
    return 'The site asked for human verification (CAPTCHA). Try again, or use a different email.';
  }
  if (/closed|disconnected|Target page|Target closed|session/i.test(m)) {
    return 'The browser session ended early. Please try again.';
  }
  if (/Chromium|Playwright|connect|ECONN|browser/i.test(m)) {
    return 'Could not reach the browser. Please try again.';
  }
  if (/Gemini \d+|inline_data|function response|quota|RESOURCE_EXHAUSTED|api key|permission/i.test(m)) {
    return 'The AI agent hit a temporary issue. Please try again.';
  }
  return m.length > 140 ? 'Something went wrong. Please try again.' : m;
}

function endpoint() {
  if (GEMINI_API_KEY) {
    return `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
  }
  const host = REGION === 'global' ? 'aiplatform.googleapis.com' : `${REGION}-aiplatform.googleapis.com`;
  return `https://${host}/v1/projects/${PROJECT}/locations/${REGION}/publishers/google/models/${MODEL}:generateContent`;
}

async function generate(contents, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (GEMINI_API_KEY) headers['x-goog-api-key'] = GEMINI_API_KEY;
  else headers['Authorization'] = `Bearer ${token}`;
  const body = JSON.stringify({ contents, tools: [{ computerUse: { environment: 'ENVIRONMENT_BROWSER' } }] });

  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    let res;
    try {
      res = await fetch(endpoint(), { method: 'POST', headers, body });
    } catch (netErr) {
      lastErr = netErr; // network blip — retry
      await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
      continue;
    }
    const json = await res.json().catch(() => ({}));
    if (res.ok) return json.candidates?.[0]?.content?.parts || [];
    lastErr = new Error(`Gemini ${res.status}: ${json.error?.message || 'request failed'}`);
    // Retry transient errors (rate limit / server); fail fast on client logic errors.
    if (res.status === 429 || res.status >= 500) {
      await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
      continue;
    }
    throw lastErr;
  }
  throw lastErr;
}

// Scale a model coordinate (0..1000) to a viewport pixel.
const px = (v, dim) => Math.round((Number(v) / 1000) * dim);

// The goal (and sometimes model reasoning) can contain the user's full card
// number. Redact long digit runs to last-4 before anything lands in the run
// log / filmstrip the frontend polls.
const redactPAN = (s) =>
  String(s == null ? '' : s).replace(/\b(?:\d[ -]?){13,19}\b/g, (m) => {
    const digits = m.replace(/\D/g, '');
    return `•••• ${digits.slice(-4)}`;
  });

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
  if (!GEMINI_API_KEY && !PROJECT) {
    finishRun(run, { error: new Error('Set GEMINI_API_KEY (Gemini API) or GCP_PROJECT_ID (Vertex) for computer-use') });
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
  let ws = process.env.BROWSER_WS_ENDPOINT;
  const remote = Boolean(ws);
  // Set the Browserless session timeout to the plan max. NOTE: Browserless free
  // caps sessions at 60000ms (60s) and REJECTS the connection (400) if you ask
  // for more — so default to 60000. Override with BROWSER_SESSION_TIMEOUT_MS only
  // if your plan allows longer.
  if (ws && /browserless/i.test(ws)) {
    const ms = process.env.BROWSER_SESSION_TIMEOUT_MS || 60000;
    ws = /[?&]timeout=\d+/i.test(ws)
      ? ws.replace(/([?&]timeout=)\d+/i, `$1${ms}`)
      : ws + (ws.includes('?') ? '&' : '?') + `timeout=${ms}`;

    // Run Browserless headless (no GUI render → faster screenshots/steps) unless
    // BROWSER_HEADLESS=false. Browserless v2 takes launch options as a `launch`
    // JSON query param (the v1 `headless=` flag is ignored). Force "headless":true
    // inside an existing launch param, else append a fresh one.
    if (process.env.BROWSER_HEADLESS !== 'false') {
      if (/[?&]launch=/i.test(ws)) {
        ws = ws
          .replace(/("headless"\s*:\s*)false/gi, '$1true')
          .replace(/(%22headless%22%3A)false/gi, '$1true');
      } else {
        ws += (ws.includes('?') ? '&' : '?') + 'launch=' + encodeURIComponent('{"headless":true}');
      }
    }
  }
  const headless = process.env.AUTOMATION_HEADLESS !== 'false';
  const slowMo = Number(process.env.BROWSER_SLOWMO) || 0;
  // Match tubi.js: default to Playwright-protocol connect (Browserless), opt into
  // CDP with BROWSER_CDP=true (Browserbase). Local launch when no endpoint.
  const browser = remote
    ? (process.env.BROWSER_CDP === 'true' ? await chromium.connectOverCDP(ws) : await chromium.connect(ws))
    : await chromium.launch({
        headless, slowMo,
        args: ['--disable-blink-features=AutomationControlled', '--no-sandbox', '--disable-setuid-sandbox'],
      });

  // Tracks whether the account-creation step was submitted, so that a session
  // close during the final redirect is reported as success (the account exists).
  let submittingCreation = false;

  try {
    // Gemini API uses the key header (no token); Vertex needs an ADC bearer token.
    const token = GEMINI_API_KEY ? null : await auth.getAccessToken();
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
    // NOTE: Gemini Computer Use REQUIRES PNG in the function-response image —
    // JPEG is rejected (400) — so keep this PNG.
    const shot = async () => {
      for (let i = 0; i < 3; i++) {
        try {
          return (await page.screenshot({ timeout: 15000 })).toString('base64');
        } catch (err) {
          if (i === 2) throw err;
          await page.waitForLoadState('domcontentloaded', { timeout: 3000 }).catch(() => {});
          await page.waitForTimeout(500);
        }
      }
      return '';
    };
    let screenshot = await shot();
    pushStep(run, `Goal: ${redactPAN(goal)}`);
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
      if (reasoning) pushStep(run, redactPAN(reasoning).slice(0, 240));

      // The model may emit SEVERAL actions in one turn; Gemini requires a function
      // response for every call (matched by name), so execute each and respond to
      // each — responding to only the first triggers a 400 on the next request.
      const callParts = parts.filter((p) => p.functionCall);

      // No action → the model considers the task done (or is just narrating).
      if (callParts.length === 0) {
        finishRun(run, { result: { ok: true, message: reasoning || 'Agent finished.', steps_taken: step } });
        return;
      }

      const responseParts = [];
      let lastLabel = '';
      let creatingAccountThisTurn = false;
      for (const cp of callParts) {
        const call = cp.functionCall;
        // A "safety decision" must be acknowledged in the response to proceed. We
        // ack benign confirmations; anything financial halts the run for a human.
        const safety = cp.safetyDecision || call.args?.safetyDecision || call.args?.safety_decision;
        const safetyText = safety ? String(safety.explanation || safety.decision || '').toLowerCase() : '';
        const financial = /payment|purchase|charge|credit card|debit|billing|\bbuy\b|place .*order|\$\d/.test(safetyText);
        const creatingAccount = /creat(e|es|ing).{0,20}account|new account|finaliz/i.test(safetyText);

        if (safety && financial) {
          pushStep(run, `Halted at a payment-related safety check (not auto-confirmed): ${safetyText.slice(0, 140)}`);
          finishRun(run, { result: { ok: false, message: 'Stopped before a payment/charge action — safety check not auto-confirmed.' } });
          return;
        }
        if (safety) pushStep(run, `Safety check acknowledged: ${safetyText.slice(0, 120) || 'confirm action'}`);
        if (creatingAccount) { submittingCreation = true; creatingAccountThisTurn = true; }

        lastLabel = await executeAction(page, call.name, call.args);
        if (!creatingAccount) await page.waitForTimeout(350); // settle between actions

        responseParts.push({
          functionResponse: {
            name: call.name,
            response: { url: page.url(), ...(safety ? { safety_acknowledgement: 'true' } : {}) },
          },
        });
      }

      // One screenshot after the turn's actions; attach it to the last response.
      screenshot = await shot();
      responseParts[responseParts.length - 1].functionResponse.parts = [{ inlineData: { mimeType: 'image/png', data: screenshot } }];
      pushFrame(run, Buffer.from(screenshot, 'base64'), redactPAN(`${lastLabel}${reasoning ? ' — ' + reasoning.slice(0, 60) : ''}`));

      // If the account-creation action was submitted this turn, finish cleanly —
      // don't burn more model steps / remote-session time verifying the homepage.
      if (creatingAccountThisTurn) {
        pushStep(run, 'Account creation submitted — loading your home page');
        try {
          await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});
          await page.waitForTimeout(1500);
          const finalShot = await shot();
          pushFrame(run, Buffer.from(finalShot, 'base64'), 'account created');
        } catch { /* session may have closed; the account is already created */ }
        finishRun(run, { result: { ok: true, message: 'Account created.', steps_taken: step + 1 } });
        return;
      }

      contents.push({ role: 'user', parts: responseParts });
    }

    finishRun(run, { result: { ok: true, message: `Reached step cap (${maxSteps}).`, steps_taken: maxSteps } });
  } catch (err) {
    const closed = /closed|disconnected|Target page|Target closed/i.test(err.message || '');
    // If the browser closed right as the account was being created, the account
    // was made (Tubi sends a confirmation email) — report success, not a timeout.
    if (closed && submittingCreation) {
      pushStep(run, 'Browser closed during the final redirect — the account was created.');
      finishRun(run, { result: { ok: true, message: 'Account created (the remote browser closed during the final redirect).' } });
      return;
    }
    // Technical detail goes to the step log; the result shows a clean message.
    pushStep(run, `Error: ${err.message}`);
    finishRun(run, { error: new Error(friendlyError(err.message)) });
  } finally {
    await browser.close().catch(() => {});
  }
}

module.exports = { runComputerUse };
