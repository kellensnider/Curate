/**
 * Tubi automation harness (Playwright).
 *
 * Tubi is free / ad-supported (no paid subscription, no card), which makes it
 * the ideal target to validate the credential-driven browser-automation
 * pipeline WITHOUT any payment / PCI exposure.
 *
 *   subscribe   -> sign in with the supplied account (proves agent can auth)
 *   unsubscribe -> sign in, then sign out (the non-destructive "cancel" analog)
 *
 * SAFETY: credentials are received per-call and held in memory only for the
 * duration of the run. They are never written to disk, logged, or persisted.
 * This is gated behind AUTOMATION_ENABLED and is intended for testing with your
 * OWN accounts only.
 */
const path = require('path');
const fs = require('fs');

const SCREENSHOT_DIR = path.join(__dirname, '../../screenshots');
const LOGIN_URL = 'https://tubitv.com/login';
const HOME_URL = 'https://tubitv.com/';

// Lazily load Playwright. `playwright-core` (a deploy dependency) is enough to
// CONNECT to a remote browser; local LAUNCH additionally needs `playwright` +
// `npx playwright install chromium`.
function loadChromium() {
  for (const pkg of ['playwright-core', 'playwright']) {
    try {
      return require(pkg).chromium;
    } catch {
      /* try next */
    }
  }
  return null;
}

// Get a browser. If BROWSER_WS_ENDPOINT is set (e.g. a Browserless/Browserbase
// websocket), connect to that remote browser — so this runs in the cloud with
// no local Chromium. Otherwise launch a local Chromium.
async function acquireBrowser(chromium) {
  const ws = process.env.BROWSER_WS_ENDPOINT;
  if (ws) {
    const browser =
      process.env.BROWSER_CDP === 'true'
        ? await chromium.connectOverCDP(ws)
        : await chromium.connect(ws);
    return { browser, remote: true };
  }
  const headless = process.env.AUTOMATION_HEADLESS !== 'false';
  const browser = await chromium.launch({
    headless,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-setuid-sandbox',
    ],
  });
  return { browser, remote: false };
}

async function snap(page, label) {
  try {
    if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    const file = `${label}-${Date.now()}.png`;
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, file) });
    return `/screenshots/${file}`;
  } catch {
    return null;
  }
}

async function dismissBanners(page) {
  for (const sel of [
    'button:has-text("Accept")',
    'button:has-text("Got it")',
    'button:has-text("OK")',
    'button[aria-label="Close"]',
  ]) {
    try {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 600 })) await el.click({ timeout: 1000 });
    } catch {
      /* ignore */
    }
  }
}

// Logged in once we've navigated away from /login and the email field is gone.
async function isLoggedIn(page) {
  for (let i = 0; i < 12; i++) {
    if (!page.url().includes('/login')) return true;
    // Surface an inline auth error early instead of waiting the full timeout.
    const err = await page
      .locator('text=/incorrect|invalid|doesn\'t match|try again|wrong/i')
      .first()
      .isVisible({ timeout: 0 })
      .catch(() => false);
    if (err) return false;
    await page.waitForTimeout(700);
  }
  return !page.url().includes('/login');
}

// Best-effort UI sign-out; falls back to clearing the session cookies.
async function signOut(page, context, steps) {
  await page.goto(HOME_URL, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
  await dismissBanners(page);

  const menuSelectors = [
    'button[aria-label*="account" i]',
    'button[aria-label*="profile" i]',
    '[data-test*="account" i]',
    'img[alt*="Avatar" i]',
    'header img[alt*="Avatar" i]',
  ];
  for (const sel of menuSelectors) {
    try {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 1000 })) {
        await el.click({ timeout: 1500 });
        await page.waitForTimeout(600);
        break;
      }
    } catch {
      /* try next */
    }
  }

  const signOutItem = page
    .locator('text=/sign out|log out/i')
    .first();
  if (await signOutItem.isVisible({ timeout: 1500 }).catch(() => false)) {
    await signOutItem.click({ timeout: 1500 }).catch(() => {});
    await page.waitForTimeout(1500);
    steps.push('Clicked Sign Out in account menu');
    return 'ui';
  }

  // Fallback: drop the session so the account is effectively signed out.
  await context.clearCookies();
  steps.push('Sign Out control not found — cleared session cookies as fallback');
  return 'cookies';
}

/**
 * @param {{action:'subscribe'|'unsubscribe', email:string, password:string}} opts
 */
async function runTubiAction({ action, email, password }) {
  const chromium = loadChromium();
  if (!chromium) {
    return {
      ok: false,
      error:
        'Playwright is not installed in this environment. Run: npm i playwright && npx playwright install chromium',
    };
  }
  if (!email || !password) {
    return { ok: false, error: 'email and password are required' };
  }

  const steps = [];
  let browser;
  try {
    const acquired = await acquireBrowser(chromium);
    browser = acquired.browser;
    if (acquired.remote) steps.push('Connected to remote browser');
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 },
    });
    const page = await context.newPage();

    steps.push('Opening Tubi sign-in');
    await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await dismissBanners(page);

    steps.push('Entering credentials');
    await page.fill('input[name="email"], #email-field, input[type="email"]', email);
    await page.fill('input[name="password"], #password-field, input[type="password"]', password);

    steps.push('Submitting sign-in');
    await page.click('button[type="submit"]:has-text("Sign In"), button:has-text("Sign In")');

    const loggedIn = await isLoggedIn(page);
    if (!loggedIn) {
      const screenshot = await snap(page, 'tubi-login-failed');
      return {
        ok: false,
        action,
        error:
          'Sign-in did not complete. Likely wrong credentials, a CAPTCHA, or a device-verification step.',
        steps,
        screenshot,
        url: page.url(),
      };
    }
    steps.push('Sign-in confirmed');

    if (action === 'unsubscribe') {
      const method = await signOut(page, context, steps);
      const screenshot = await snap(page, 'tubi-unsubscribe');
      return {
        ok: true,
        action: 'unsubscribe',
        message: `Cancelled Tubi (signed out via ${method})`,
        steps,
        screenshot,
      };
    }

    const screenshot = await snap(page, 'tubi-subscribe');
    return {
      ok: true,
      action: 'subscribe',
      message: 'Subscribed: signed into Tubi successfully',
      steps,
      screenshot,
    };
  } catch (err) {
    return { ok: false, action, error: err.message, steps };
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

module.exports = { runTubiAction };
