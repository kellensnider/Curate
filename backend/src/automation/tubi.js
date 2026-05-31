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

// React-controlled inputs can silently drop a value set before the form
// hydrates. Fill, then verify and re-type if it didn't stick.
async function robustFill(page, selector, value) {
  const el = page.locator(selector).first();
  await el.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
  await el.fill(value).catch(() => {});
  const got = await el.inputValue().catch(() => '');
  if (got !== value) {
    await el.click().catch(() => {});
    await el.fill('').catch(() => {});
    await el.type(value, { delay: 35 }).catch(() => {});
  }
}

// Logged in once we've left the auth pages (/login, /signup) and no auth form
// (email field) is still showing — works for both sign-in and sign-up success.
async function isLoggedIn(page) {
  const onAuthPage = () => /\/login|\/signup/.test(page.url());
  for (let i = 0; i < 14; i++) {
    if (!onAuthPage()) {
      const emailVisible = await page
        .locator('#email-field, input[type="email"]')
        .first()
        .isVisible({ timeout: 0 })
        .catch(() => false);
      if (!emailVisible) return true;
    }
    const err = await page
      .locator('text=/incorrect|invalid|doesn\'t match|try again|wrong|already (have|exists|in use)/i')
      .first()
      .isVisible({ timeout: 0 })
      .catch(() => false);
    if (err) return false;
    await page.waitForTimeout(700);
  }
  return !onAuthPage();
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

const SIGNUP_URL = 'https://tubitv.com/signup';

async function loginTubi(page, email, password, steps) {
  steps.push('Opening Tubi sign-in');
  await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await dismissBanners(page);
  steps.push('Entering credentials');
  await robustFill(page, 'input[name="email"], #email-field, input[type="email"]', email);
  await robustFill(page, 'input[name="password"], #password-field, input[type="password"]', password);
  steps.push('Submitting sign-in');
  await page.click('button[type="submit"]:has-text("Sign In"), button:has-text("Sign In")');
  return isLoggedIn(page);
}

// Turn Tubi's auth errors into an actionable message.
async function authFailureHint(page) {
  const passwordless = await page
    .locator('text=/without a password/i')
    .first()
    .isVisible({ timeout: 600 })
    .catch(() => false);
  if (passwordless) {
    return 'Tubi rejected the password and offered passwordless sign-in — this account is almost certainly a Google ("Continue with Google") / no-password account. Email+password automation can\'t sign into it. Test with a fresh email so Subscribe creates a real password account.';
  }
  const invalid = await page
    .locator('text=/invalid email|incorrect|wrong password/i')
    .first()
    .isVisible({ timeout: 600 })
    .catch(() => false);
  if (invalid) {
    return 'Tubi rejected the email/password — the password is wrong, or the account has no password (Google sign-in). Use a fresh email, or reset the password on Tubi first.';
  }
  return null;
}

async function emailExistsError(page) {
  // IMPORTANT: do NOT match the benign "Already have an account? Sign In" prompt
  // that is always present on the sign-up page — only real "exists" errors.
  return page
    .locator('text=/already (exists|in use|registered|taken)|account already exists|email is already/i')
    .first()
    .isVisible({ timeout: 1500 })
    .catch(() => false);
}

// Best-effort: a 2nd sign-up step commonly asks for date of birth.
async function fillBirthIfPresent(page, steps) {
  const dateInput = page.locator('input[type="date"]').first();
  if (await dateInput.isVisible({ timeout: 1200 }).catch(() => false)) {
    await dateInput.fill('1990-01-15').catch(() => {});
    steps.push('Set date of birth');
    return;
  }
  const birthText = page
    .locator(
      'input[name*="birth" i], input[id*="birth" i], input[name*="year" i], input[id*="year" i], input[placeholder*="MM/DD" i], input[placeholder*="YYYY" i]',
    )
    .first();
  if (await birthText.isVisible({ timeout: 800 }).catch(() => false)) {
    const ph = (await birthText.getAttribute('placeholder').catch(() => '')) || '';
    await birthText.fill(/year|yyyy/i.test(ph) && !/mm/i.test(ph) ? '1990' : '01/15/1990').catch(() => {});
    steps.push('Set date of birth');
    return;
  }
  const selects = page.locator('select');
  const n = await selects.count().catch(() => 0);
  for (let i = 0; i < n; i++) {
    const opts = await selects.nth(i).locator('option').count().catch(() => 0);
    if (opts > 1) await selects.nth(i).selectOption({ index: opts > 30 ? 25 : 1 }).catch(() => {});
  }
  if (n > 0) steps.push('Filled profile selects');
}

// Tubi's actual 2nd sign-up step: Age + Gender (custom dropdown) -> Continue.
async function completeTubiAgeGender(page, steps) {
  const ageField = page.locator('#age-field, input[name="age"]').first();
  if (!(await ageField.isVisible({ timeout: 4000 }).catch(() => false))) return false;

  await ageField.fill('30').catch(() => {});

  // Gender is a custom dropdown, not a <select>.
  const genderTrigger = page.locator('.web-dropdown--input').first();
  if (await genderTrigger.isVisible({ timeout: 1500 }).catch(() => false)) {
    await genderTrigger.click().catch(() => {});
    await page.waitForTimeout(400);
    const option = page
      .locator('#web-dropdown-option-0-gender, #web-dropdown-options-gender li[role="option"]')
      .first();
    await option.click({ timeout: 2000 }).catch(() => {});
  }
  steps.push('Entered age & gender');

  const cont = page.locator('button:has-text("Continue"), button[type="submit"]').first();
  if (await cont.isVisible({ timeout: 1500 }).catch(() => false)) {
    await cont.click().catch(() => {});
    steps.push('Submitted age & gender');
    await page.waitForTimeout(3000);
  }
  return true;
}

// Create a brand-new Tubi account. Returns { ok, reason }.
async function registerTubi(page, { firstName, email, password }, steps) {
  steps.push('Opening Tubi sign-up');
  await page.goto(SIGNUP_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await dismissBanners(page);

  steps.push('Filling new-account details');
  await robustFill(page, 'input[name="firstName"], #firstName-field', firstName);
  await robustFill(page, 'input[name="email"], #email-field, input[type="email"]', email);
  await robustFill(page, 'input[name="password"], #password-field, input[type="password"]', password);

  steps.push('Submitting sign-up');
  await page
    .click('button[type="submit"]:has-text("Next"), button:has-text("Next"), button[type="submit"]')
    .catch(() => {});

  // SUCCESS is signalled by advancing to Tubi's Age/Gender step (#age-field).
  // Wait for that as the source of truth — don't infer "exists" from page text.
  const reachedStep2 = await page
    .locator('#age-field, input[name="age"]')
    .first()
    .waitFor({ state: 'visible', timeout: 12000 })
    .then(() => true)
    .catch(() => false);

  if (!reachedStep2) {
    // Didn't advance: the email already exists (Tubi bounces to /login or shows
    // a real error), or sign-up was blocked (CAPTCHA / bot check).
    if (page.url().includes('/login') || (await emailExistsError(page))) {
      return { ok: false, reason: 'exists' };
    }
    return { ok: false, reason: 'unknown' };
  }
  steps.push('Reached age/gender step');

  // Step 2 is Tubi's Age + Gender screen; handle it specifically.
  const did2 = await completeTubiAgeGender(page, steps);
  if (!did2) {
    // Fallback for any other 2nd-step shape (date of birth, etc.).
    await fillBirthIfPresent(page, steps);
    const finalBtn = page
      .locator(
        'button:has-text("Sign Up"), button:has-text("Create"), button:has-text("Continue"), button:has-text("Done"), button:has-text("Next"), button[type="submit"]',
      )
      .first();
    if (await finalBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
      steps.push('Completing sign-up');
      await finalBtn.click().catch(() => {});
    }
  }

  const loggedIn = await isLoggedIn(page);
  return { ok: loggedIn, reason: loggedIn ? 'created' : 'unknown' };
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
    // Reuse the default context when connecting over CDP; otherwise create one.
    const context =
      browser.contexts()[0] ||
      (await browser.newContext({
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 800 },
      }));
    const page = context.pages()[0] || (await context.newPage());

    const firstName =
      (email.split('@')[0] || 'Curate').replace(/[^a-zA-Z]/g, '').slice(0, 20) || 'Curate';

    // ── Subscribe = create a new Tubi account (fall back to sign-in if it
    //    already exists), so it works whether or not the user has an account.
    if (action === 'subscribe') {
      // login-first is opt-in: try the existing account, create one only if
      // there's no session.
      if (process.env.TUBI_SUBSCRIBE_ORDER === 'login-first') {
        steps.push('Trying sign-in first');
        if (await loginTubi(page, email, password, steps)) {
          const screenshot = await snap(page, 'tubi-subscribe');
          return { ok: true, action: 'subscribe', message: 'Subscribed: signed into existing Tubi account', steps, screenshot };
        }
        steps.push('No existing session — creating an account');
        const reg = await registerTubi(page, { firstName, email, password }, steps);
        const screenshot = await snap(page, reg.ok ? 'tubi-subscribe' : 'tubi-subscribe-failed');
        return reg.ok
          ? { ok: true, action: 'subscribe', message: 'Subscribed: created a new Tubi account', steps, screenshot }
          : { ok: false, action: 'subscribe', error: (await authFailureHint(page)) || 'Could not create a Tubi account (sign-up did not complete). See screenshot.', steps, screenshot, url: page.url() };
      }

      // Default: create the account. Only fall back to sign-in if the email
      // ALREADY has an account — a genuine sign-up failure is reported as such.
      steps.push('Creating a Tubi account');
      const reg = await registerTubi(page, { firstName, email, password }, steps);
      if (reg.ok) {
        const screenshot = await snap(page, 'tubi-subscribe');
        return { ok: true, action: 'subscribe', message: 'Subscribed: created a new Tubi account', steps, screenshot };
      }
      if (reg.reason === 'exists') {
        steps.push('Email already has an account — signing in instead');
        const li = await loginTubi(page, email, password, steps);
        const screenshot = await snap(page, li ? 'tubi-subscribe' : 'tubi-subscribe-failed');
        return li
          ? { ok: true, action: 'subscribe', message: 'Account already existed — signed in', steps, screenshot }
          : { ok: false, action: 'subscribe', error: (await authFailureHint(page)) || 'Account already exists but sign-in failed (wrong password, or a Google account).', steps, screenshot, url: page.url() };
      }
      // New email, but sign-up didn't finish — surface it (no sign-in fallback).
      const screenshot = await snap(page, 'tubi-subscribe-failed');
      return {
        ok: false,
        action: 'subscribe',
        error:
          'Sign-up did not complete — it got stuck on a sign-up step (e.g. age/gender) or hit a CAPTCHA. See screenshot.',
        steps,
        screenshot,
        url: page.url(),
      };
    }

    // ── Unsubscribe = sign in, then sign out (non-destructive "cancel").
    const loggedIn = await loginTubi(page, email, password, steps);
    if (!loggedIn) {
      const screenshot = await snap(page, 'tubi-login-failed');
      const hint = await authFailureHint(page);
      return {
        ok: false,
        action: 'unsubscribe',
        error:
          hint ||
          'Sign-in did not complete. Likely wrong credentials, a CAPTCHA, or a device-verification step.',
        steps,
        screenshot,
        url: page.url(),
      };
    }
    steps.push('Sign-in confirmed');
    const method = await signOut(page, context, steps);
    const screenshot = await snap(page, 'tubi-unsubscribe');
    return {
      ok: true,
      action: 'unsubscribe',
      message: `Cancelled Tubi (signed out via ${method})`,
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
