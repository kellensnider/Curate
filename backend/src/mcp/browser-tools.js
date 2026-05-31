const path = require('path');
const fs = require('fs');

const SCREENSHOT_DIR = path.join(__dirname, '../../screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

// Lazily load Chromium. `playwright-core` (a deploy dependency) can launch the
// already-installed browser; `playwright` is only needed if you want it to
// manage browser downloads. Loading lazily means importing this module never
// crashes just because the full `playwright` package isn't present.
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

// ─── Browser helpers ──────────────────────────────────────────────────────────

// Demo controls (env):
//   AUTOMATION_HEADLESS=false  → real Chrome windows pop up on the demo machine
//   BROWSER_SLOWMO=400         → slow each action so the audience can follow
//   BROWSER_WS_ENDPOINT=wss... → drive a remote browser (cloud), no local Chromium
//
// `onPage(page)` is invoked as soon as the page exists so callers (the run
// registry) can attach live frame capture for the filmstrip.
async function withBrowser(fn, { onPage } = {}) {
  const chromium = loadChromium();
  if (!chromium) {
    return {
      success: false,
      error: 'not_installed',
      message: 'Playwright/Chromium not available. Run: npm i playwright-core (Chromium is already cached) or npm i playwright && npx playwright install chromium',
    };
  }

  const ws = process.env.BROWSER_WS_ENDPOINT;
  const headless = process.env.AUTOMATION_HEADLESS !== 'false';
  const slowMo = Number(process.env.BROWSER_SLOWMO) || 0;

  const browser = ws
    ? (process.env.BROWSER_CDP === 'true' ? await chromium.connectOverCDP(ws) : await chromium.connect(ws))
    : await chromium.launch({
        headless,
        slowMo,
        args: ['--disable-blink-features=AutomationControlled', '--no-sandbox', '--disable-setuid-sandbox', '--start-maximized'],
      });

  const context = browser.contexts()[0] || await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
  });
  const page = context.pages()[0] || await context.newPage();
  if (typeof onPage === 'function') {
    try { await onPage(page); } catch { /* capture hook must never break the run */ }
  }
  try {
    return await fn(page);
  } finally {
    await browser.close().catch(() => {});
  }
}

async function dismissPopups(page) {
  for (const sel of [
    'button:has-text("Not now")', 'button:has-text("No thanks")',
    'button:has-text("Accept All")', 'button[aria-label="Close"]',
    'button:has-text("Got it")', 'button:has-text("Agree")',
  ]) {
    try {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 800 })) await el.click();
    } catch (_) {}
  }
}

// Dismiss banner then click+type for React forms
async function reactType(page, selector, value) {
  await page.locator(selector).click();
  await page.keyboard.type(value, { delay: 40 });
}

async function screenshot(page, service) {
  const file = `${service}-payment-${Date.now()}.png`;
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, file) });
  return `/screenshots/${file}`;
}

// ─── MyDisney shared auth (used by Disney+ AND Hulu) ─────────────────────────
// Both services use the same MyDisney account + billing infrastructure.

async function myDisneyCreateAccount(page, email, password) {
  // Step 1: enter email
  await page.locator('input[type="email"], input[placeholder="Email"]').fill(email);
  await page.locator('button:has-text("Continue")').click();
  await page.waitForTimeout(1500);

  // Email confirmation modal — three escalating methods
  try {
    await page.waitForSelector('text=Review your email address', { timeout: 4000 });
    await page.locator('[role="dialog"] button:has-text("Continue"), [role="alertdialog"] button:has-text("Continue")').click({ force: true }).catch(() => {});
    await page.waitForTimeout(600);
    if (await page.locator('text=Review your email address').isVisible({ timeout: 500 }).catch(() => false)) {
      await page.keyboard.press('Enter');
      await page.waitForTimeout(600);
    }
    if (await page.locator('text=Review your email address').isVisible({ timeout: 500 }).catch(() => false)) {
      await page.evaluate(() => {
        const btns = [...document.querySelectorAll('button')];
        const cont = btns.find(b => b.textContent.trim() === 'Continue' && b.closest('[class*="modal"],[class*="dialog"],[class*="overlay"]'));
        if (cont) cont.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      });
      await page.waitForTimeout(1500);
    }
  } catch (_) {}
  await page.waitForTimeout(500);

  // Step 2: password page — Hulu also shows Name, Birthdate, Gender on same screen
  await page.waitForSelector('input[type="password"]', { timeout: 30000 });
  await page.locator('input[type="password"]').fill(password);

  // Name (Hulu only)
  const nameInput = page.locator('input[placeholder*="Name"], input[name="name"], input[id*="name"]').first();
  if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) await nameInput.fill('Curate Demo');

  // Birthdate on same page (Hulu uses MM/DD format text field)
  const birthdateInput = page.locator('input[placeholder*="MM/DD"], input[id*="birth"], input[placeholder*="birth"]').first();
  if (await birthdateInput.isVisible({ timeout: 2000 }).catch(() => false)) await birthdateInput.fill('01/15/1995');

  // Gender dropdown (Hulu) — try native select first, then JS trigger
  const genderPicked = await page.evaluate(() => {
    for (const s of document.querySelectorAll('select')) {
      if ((s.id + s.name + (s.getAttribute('aria-label') || '')).toLowerCase().includes('gender') && s.options.length > 1) {
        s.value = s.options[1].value;
        s.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
    }
    return false;
  });
  if (!genderPicked) {
    await page.evaluate(() => {
      for (const l of document.querySelectorAll('label, [class*="label"]')) {
        if (l.textContent.trim().toLowerCase() === 'gender') {
          const parent = l.closest('[class*="select"],[class*="field"],[class*="form"]') || l.parentElement;
          const trigger = parent?.querySelector('[role="button"],[tabindex],input') || l.nextElementSibling;
          if (trigger) { trigger.click(); return; }
        }
      }
    });
    await page.waitForTimeout(400);
    await page.locator('[role="option"], li[data-value], li[role="menuitem"]').first().click({ force: true }).catch(() => {});
  }

  await page.locator('button:has-text("Agree & Continue"), button:has-text("Agree and Continue")').click({ force: true });
  await page.waitForTimeout(3000);

  // Birthdate on separate page (/missing-info) — Disney+ path
  try {
    await page.waitForSelector('input[placeholder="MM/DD/YYYY"]', { timeout: 5000 });
    await page.locator('input[placeholder="MM/DD/YYYY"]').fill('01/15/1995');
    await page.locator('button:has-text("Save & Continue")').click();
    await page.waitForTimeout(1500);
  } catch (_) {}
}

// Fill the shared Disney/Hulu billing form (confirmed selectors — same for both services)
async function fillMyDisneyBillingForm(page, paymentMethod) {
  await page.waitForSelector('input[id*="card"], input[name*="card"], input[id*="billing"]', { timeout: 12000 });
  await page.locator('#billing-card-number, input[name="cardnumber"]').first().fill(paymentMethod.card_number);
  await page.locator('#billing-card-exp-date, input[name="cardexp"]').first().fill(`${paymentMethod.expiry_month}/${paymentMethod.expiry_year.slice(-2)}`);
  await page.locator('#billing-card-CSC, input[name="cardcsc"]').first().fill(paymentMethod.cvv);
  await page.locator('#billing-card-name, input[name="cardname"]').first().fill(paymentMethod.name);
  await page.locator('#zip-code-dropdown-input, input[name="cardzipcode"]').first().fill(paymentMethod.zip);
}

// ─── NETFLIX ──────────────────────────────────────────────────────────────────
// Standalone signup, $7.99/mo (Standard With Ads — confirmed live)
// Flow: /signup → plan intro → plan select → account intro →
//       email+pw form → skip email verify → credit card → fill → STOP

async function netflixSubscribe(email, password, paymentMethod, opts) {
  return withBrowser(async (page) => {
    await page.goto('https://www.netflix.com/signup');
    await page.waitForTimeout(1000);

    // Plan intro screen — Next
    await page.locator('button:has-text("Next")').click();
    await page.waitForTimeout(800);

    // Plan selection — pick Standard with ads (cheapest)
    await page.locator('h2:has-text("Standard with ads")').click({ timeout: 8000, force: true })
      .catch(() => page.locator('text=Standard with ads').first().click({ force: true }).catch(() => {}));
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    await page.locator('button:has-text("Next")').click();
    await page.waitForTimeout(800);

    // Account setup intro — Next
    await page.locator('button:has-text("Next")').click();
    await page.waitForTimeout(800);

    // Email + password (Netflix uses standard fill, not React pattern)
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="password"]').fill(password);
    await page.locator('button:has-text("Next")').click();
    await page.waitForTimeout(2000);

    // Email verification — skip
    await page.waitForSelector('button:has-text("Skip")', { timeout: 10000 });
    await page.locator('button:has-text("Skip")').click();
    await page.waitForTimeout(1000);

    // Payment method selection
    await page.locator('text=Credit or Debit Card').click();
    await page.waitForTimeout(1000);

    // Fill card form — do NOT click "Start Membership"
    await page.getByRole('textbox', { name: 'Card number' }).fill(paymentMethod.card_number);
    await page.getByRole('textbox', { name: 'Expiration date' }).fill(`${paymentMethod.expiry_month}/${paymentMethod.expiry_year.slice(-2)}`);
    await page.getByRole('textbox', { name: 'CVV' }).fill(paymentMethod.cvv);
    await page.getByRole('textbox', { name: 'Name on card' }).fill(paymentMethod.name);
    await page.getByRole('textbox', { name: 'ZIP code' }).fill(paymentMethod.zip);

    const screenshotUrl = await screenshot(page, 'netflix');
    return { success: true, service: 'netflix', email, action: 'subscribe', reached_payment: true, screenshot: screenshotUrl, plan: 'Standard with Ads ($7.99/mo)' };
  }, opts);
}

// ─── DISNEY+ ─────────────────────────────────────────────────────────────────
// Disney+/Hulu Bundle (Disney+ no longer sells standalone), $12.99/mo
// Flow: /commerce/cadence → billing cadence → MyDisney signup → /commerce/billing → fill → STOP

async function disneySubscribe(email, password, paymentMethod, opts) {
  return withBrowser(async (page) => {
    // Disney+ only sells as Disney+/Hulu bundle now — cheapest is $12.99/mo monthly
    await page.goto('https://www.disneyplus.com/commerce/cadence?package=disney_duo_basic');
    await page.waitForTimeout(1500);
    await page.locator('text=1 month, billed monthly').click();
    await page.waitForTimeout(500);
    await page.locator('button:has-text("Continue")').click();
    await page.waitForTimeout(2000);

    await myDisneyCreateAccount(page, email, password);
    await fillMyDisneyBillingForm(page, paymentMethod);

    const screenshotUrl = await screenshot(page, 'disney');
    return { success: true, service: 'disney', email, action: 'subscribe', reached_payment: true, screenshot: screenshotUrl, plan: 'Disney+/Hulu Bundle ($12.99/mo)' };
  }, opts);
}

// ─── HULU ─────────────────────────────────────────────────────────────────────
// Hulu With Ads (standalone), $11.99/mo
// Flow: /signup/plan → /commerce/plans → featured-offer-cta →
//       MyDisney signup (/web/create-account/enter-email) →
//       /commerce/billing → fill → STOP
// Note: Hulu uses the same MyDisney auth + billing infra as Disney+

async function huluSubscribe(email, password, paymentMethod, opts) {
  return withBrowser(async (page) => {
    // Hulu With Ads — $11.99/mo, 1-month free trial
    await page.goto('https://www.hulu.com/signup/plan');
    await page.waitForTimeout(2000);
    await dismissPopups(page);

    // Featured plan CTA selects the default Hulu plan card
    await page.locator('[data-testid="featured-offer-cta"]').click();
    await page.waitForTimeout(2000);

    // MyDisney auth (same as Disney+ — Hulu is a Walt Disney Company)
    await myDisneyCreateAccount(page, email, password);

    // Billing page — identical selectors to Disney+
    await fillMyDisneyBillingForm(page, paymentMethod);

    const screenshotUrl = await screenshot(page, 'hulu');
    return { success: true, service: 'hulu', email, action: 'subscribe', reached_payment: true, screenshot: screenshotUrl, plan: 'Hulu With Ads ($11.99/mo)' };
  }, opts);
}

// ─── MAX ─────────────────────────────────────────────────────────────────────
// Max Basic With Ads — $10.99/mo
// Flow: /subscribe → legal modal → Monthly tab → Basic With Ads → Continue →
//       Add-ons page → Continue → auth.hbomax.com/create-account (2-step) →
//       payment form → fill → STOP
// Note: Max (WBD account) may reject disposable email domains in production.
//       Use user's real email from DB when shipping.

async function maxSubscribe(email, password, paymentMethod, opts) {
  return withBrowser(async (page) => {
    await page.goto('https://www.max.com/subscribe');
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1000);

    // Dismiss legal/privacy modal — retry up to 3x (timing is inconsistent)
    for (let i = 0; i < 3; i++) {
      const agreeBtn = page.locator('button:has-text("Agree")').first();
      if (await agreeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await agreeBtn.click({ force: true });
        await page.waitForTimeout(800);
        break;
      }
    }

    // Switch to Monthly tab (page defaults to Bundles)
    const monthlyTab = page.locator('button:has-text("Monthly"), [role="tab"]:has-text("Monthly")').first();
    if (await monthlyTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await monthlyTab.click();
      await page.waitForTimeout(1000);
    }

    // Select Basic With Ads (cheapest) then Continue
    const basicPlan = page.locator('text=Basic With Ads').first();
    if (await basicPlan.isVisible({ timeout: 3000 }).catch(() => false)) {
      await basicPlan.click();
      await page.waitForTimeout(500);
    }
    await page.locator('button:has-text("Continue")').first().click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(2000);

    // Add-ons page ("Add to Your Base Plan") — skip, just Continue
    const addOnsContinue = page.locator('button:has-text("Continue")').first();
    if (await addOnsContinue.isVisible({ timeout: 4000 }).catch(() => false)) {
      await addOnsContinue.click();
      await page.waitForURL('**hbomax.com**', { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(2000);
    }

    // Account creation — 2-step WBD flow
    // Step 1: "Get Started" — email only
    await page.waitForSelector('input[type="email"], input[type="text"]', { timeout: 10000 });
    await page.locator('input[type="email"], input[type="text"]').first().fill(email);
    await page.locator('button:has-text("Continue"), button[type="submit"]').first().click({ force: true });
    await page.waitForTimeout(2000);

    // Step 2: "Create Your Account" — Confirm Email, Password, First Name, Last Name
    await page.waitForSelector('input[type="password"]', { timeout: 15000 });
    await page.waitForTimeout(500);
    const allInputs = await page.locator('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"])').all();
    for (const inp of allInputs) {
      const type  = await inp.getAttribute('type');
      const field = ((await inp.getAttribute('placeholder')) || '') + ((await inp.getAttribute('name')) || '') + ((await inp.getAttribute('aria-label')) || '');
      await inp.click({ clickCount: 3 });
      if (field.toLowerCase().includes('confirm')) {
        await page.keyboard.type(email, { delay: 30 });
      } else if (type === 'email' || field.toLowerCase().includes('email')) {
        await page.keyboard.type(email, { delay: 30 });
      } else if (type === 'password') {
        await page.keyboard.type('TestCurate2024!', { delay: 30 }); // min 10 chars, no 4-in-a-row
      } else if (field.toLowerCase().includes('first')) {
        await page.keyboard.type('Curate', { delay: 30 });
      } else if (field.toLowerCase().includes('last')) {
        await page.keyboard.type('Demo', { delay: 30 });
      } else if (type === 'text' && !field.toLowerCase().includes('search')) {
        await page.keyboard.type('Curate', { delay: 30 });
      }
      await page.keyboard.press('Tab');
      await page.waitForTimeout(200);
    }

    await page.locator('button:has-text("Create Account"), button:has-text("Sign Up"), button[type="submit"]').first().click({ force: true });
    await page.waitForTimeout(4000);

    // "Choose How to Pay" — expand Credit Card section (collapsed by default)
    await page.waitForSelector('text=Credit or Debit Card', { timeout: 12000 });
    await page.locator('text=Credit or Debit Card').first().click();
    await page.waitForTimeout(2000);

    // Max uses Spreedly for card number + CVV (iframe-hosted), name/expiry/zip are direct DOM
    await page.locator('#cardHolderNameField').fill(paymentMethod.name);
    await page.locator('#expiryDateField').fill(`${paymentMethod.expiry_month}/${paymentMethod.expiry_year.slice(-2)}`);
    await page.locator('#postalCodeField').fill(paymentMethod.zip);

    // Card number — Spreedly number iframe
    const numberFrame = page.frames().find(f => f.url().includes('spreedly') && f.url().includes('number'));
    if (numberFrame) {
      const numInput = numberFrame.locator('input').first();
      await numInput.click();
      await numInput.type(paymentMethod.card_number, { delay: 30 });
    }

    // CVV — Spreedly CVV iframe
    const cvvFrame = page.frames().find(f => f.url().includes('spreedly') && f.url().includes('cvv'));
    if (cvvFrame) {
      const cvvInput = cvvFrame.locator('input').first();
      await cvvInput.click();
      await cvvInput.type(paymentMethod.cvv, { delay: 30 });
    }

    const screenshotUrl = await screenshot(page, 'max');
    return { success: true, service: 'max', email, action: 'subscribe', reached_payment: true, screenshot: screenshotUrl, plan: 'Max Basic With Ads ($10.99/mo)' };
  }, opts);
}

// ─── TUBI (free, no payment) ──────────────────────────────────────────────────

async function tubiCreateAccount(email, password, firstName = 'CurateUser', opts) {
  return withBrowser(async (page) => {
    await page.goto('https://tubitv.com/signup');
    await page.waitForTimeout(1500);
    await dismissPopups(page);

    await reactType(page, '#firstName-field', firstName);
    await reactType(page, '#email-field', email);
    await reactType(page, '#password-field', password);
    await page.locator('text=Register via Email').click();
    await page.waitForTimeout(800);
    await page.waitForFunction(() => { const b = document.querySelector('button[name="submit"]'); return b && !b.disabled; }, { timeout: 5000 }).catch(() => {});
    await page.locator('button[name="submit"]').click({ force: true });

    await page.waitForSelector('text=To continue, please enter your age', { timeout: 15000 });
    await page.getByRole('textbox', { name: 'Age' }).fill('25');
    await page.locator('.web-dropdown--input-text').click();
    await page.getByRole('option', { name: 'Other', exact: true }).click();
    await page.locator('button:has-text("Continue")').click();
    await page.waitForURL('https://tubitv.com/', { timeout: 10000 });

    return { success: true, service: 'tubi', email, action: 'signup', reached_payment: false };
  }, opts);
}

async function tubiDeleteAccount(email, password, opts) {
  return withBrowser(async (page) => {
    // Login
    await page.goto('https://tubitv.com/login');
    await page.waitForTimeout(1500);
    await dismissPopups(page);
    await reactType(page, '#email-field', email);
    await reactType(page, '#password-field', password);
    await page.locator('text=Sign In').first().click();
    await page.waitForTimeout(500);
    await page.waitForFunction(() => { const b = document.querySelector('button[name="submit"]'); return b && !b.disabled; }, { timeout: 5000 }).catch(() => {});
    await page.locator('button[name="submit"]').click({ force: true });
    await page.waitForURL('https://tubitv.com/', { timeout: 10000 });

    // Delete
    await page.goto('https://tubitv.com/account');
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.scrollTo(0, 600));
    await page.waitForTimeout(500);
    await page.locator('button.vxyY8, button:has-text("Delete Account")').first().click();
    await page.waitForSelector('text=We are sorry to see you go');
    await page.locator('button:has-text("Skip")').click();
    await page.waitForSelector('text=One last step');
    await page.locator('#text-input-password').fill(password);
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await page.waitForURL('https://tubitv.com/', { timeout: 10000 });

    return { success: true, service: 'tubi', email, action: 'delete' };
  }, opts);
}

// ─── Placeholder stubs ────────────────────────────────────────────────────────
// These services have not yet had their flows mapped.
// Each returns a clear not-implemented response so the agent can inform the user.

function notImplemented(service) {
  return { success: false, service, error: 'not_implemented', message: `Browser automation for ${service} is not yet available. Supported: netflix, disney, hulu, max, tubi.` };
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

async function subscribeToService(service, email, password, paymentMethod, opts) {
  switch (service) {
    case 'netflix':   return netflixSubscribe(email, password, paymentMethod, opts);
    case 'disney':    return disneySubscribe(email, password, paymentMethod, opts);
    case 'hulu':      return huluSubscribe(email, password, paymentMethod, opts);
    case 'max':       return maxSubscribe(email, password, paymentMethod, opts);
    case 'tubi':      return tubiCreateAccount(email, password, 'CurateUser', opts);
    // Stubs — ready for future implementation
    case 'peacock':   return notImplemented('peacock');
    case 'prime':     return notImplemented('prime');
    case 'paramount': return notImplemented('paramount');
    default:          return { success: false, error: `Unknown service: ${service}` };
  }
}

// ─── MCP tool definitions ─────────────────────────────────────────────────────

const BROWSER_TOOLS = [
  {
    name: 'subscribe_to_service',
    description: 'Opens a real browser and navigates a streaming service signup flow up to and including filling the payment method screen. Does NOT submit payment — stops before the final subscribe button. Returns a screenshot of the filled payment form. Requires payment_method from the user\'s stored card info. Fully implemented: netflix, disney, hulu, max, tubi. Stubs (not yet implemented): peacock, prime, paramount.',
    input_schema: {
      type: 'object',
      properties: {
        service: {
          type: 'string',
          enum: ['netflix', 'disney', 'hulu', 'max', 'tubi', 'peacock', 'prime', 'paramount'],
          description: 'Which streaming service to subscribe to'
        },
        email:    { type: 'string', description: "User's email address" },
        password: { type: 'string', description: "Password for the new account" },
        payment_method: {
          type: 'object',
          description: "User's stored payment card",
          properties: {
            card_number:   { type: 'string' },
            expiry_month:  { type: 'string', description: '2-digit month e.g. "04"' },
            expiry_year:   { type: 'string', description: '4-digit year e.g. "2028"' },
            cvv:           { type: 'string' },
            zip:           { type: 'string' },
            name:          { type: 'string', description: 'Name on card' }
          },
          required: ['card_number', 'expiry_month', 'expiry_year', 'cvv', 'zip', 'name']
        }
      },
      required: ['service', 'email', 'password', 'payment_method']
    }
  },
  {
    name: 'tubi_create_account',
    description: 'Creates a free Tubi account (no payment required). Useful for demonstrating the subscription flow end-to-end without any card details.',
    input_schema: {
      type: 'object',
      properties: {
        email:      { type: 'string' },
        password:   { type: 'string' },
        first_name: { type: 'string' }
      },
      required: ['email', 'password']
    }
  },
  {
    name: 'tubi_delete_account',
    description: 'Deletes a Tubi account — equivalent to canceling the service. Used to demonstrate and test the unsubscribe flow.',
    input_schema: {
      type: 'object',
      properties: {
        email:    { type: 'string' },
        password: { type: 'string' }
      },
      required: ['email', 'password']
    }
  }
];

async function executeBrowserTool(toolName, input, opts) {
  switch (toolName) {
    case 'subscribe_to_service':
      return subscribeToService(input.service, input.email, input.password, input.payment_method, opts);
    case 'tubi_create_account':
      return tubiCreateAccount(input.email, input.password, input.first_name, opts);
    case 'tubi_delete_account':
      return tubiDeleteAccount(input.email, input.password, opts);
    default:
      return { error: `Unknown browser tool: ${toolName}` };
  }
}

module.exports = { BROWSER_TOOLS, executeBrowserTool, subscribeToService };
