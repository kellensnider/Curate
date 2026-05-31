/**
 * Demo orchestrator — runs a real browser signup/signin flow in the background
 * while streaming live frames into the run registry for the dashboard filmstrip.
 *
 * Returns immediately with a run record; the browser work continues async and
 * the frontend polls GET /api/automation/runs/:id to watch it progress.
 *
 * Safety: the underlying flows (browser-tools.js) navigate the real signup and
 * fill the payment screen but STOP before the final submit — except Tubi, which
 * is free and completes a real account create/login (no card, no PCI risk).
 */
const { subscribeToService } = require('../mcp/browser-tools');
const { createRun, pushStep, finishRun, startFrameCapture } = require('./runs');
const { runComputerUse } = require('./computer-use');

function startDemoRun({ service, action = 'subscribe', email, password, paymentMethod }) {
  const run = createRun(service, action);
  pushStep(run, `Preparing ${service} ${action}`);

  // Fire-and-forget: the HTTP handler returns the run id right away.
  (async () => {
    let stopCapture = async () => {};
    try {
      const result = await subscribeToService(service, email, password, paymentMethod, {
        onPage: async (page) => {
          pushStep(run, 'Browser window opened');
          stopCapture = startFrameCapture(run, page, { label: `${service} — opening` });
        },
      });
      await stopCapture(`${service} — finished`);

      if (result?.success) {
        pushStep(run, result.reached_payment
          ? `Reached payment screen (${result.plan || service}) — stopped before submit`
          : `Completed: ${result.plan || result.message || service}`);
      } else {
        pushStep(run, `Stopped: ${result?.message || result?.error || 'did not complete'}`);
      }
      finishRun(run, { result });
    } catch (err) {
      await stopCapture('error');
      pushStep(run, `Error: ${err.message}`);
      finishRun(run, { error: err });
    }
  })();

  return run;
}

// ─── Computer-Use agent (Gemini 2.5 Computer Use on Vertex drives the browser) ─
// Per-service goal + start URL. Tubi is free (completes for real, no card);
// paid services are instructed to STOP before submitting any payment.
function computerUsePreset(service, { email, password }) {
  const creds = `Use email "${email}" and password "${password}".`;
  // First name from the email local part, like the previous Tubi workflow.
  const firstName = (email.split('@')[0] || 'Curate').replace(/[^a-zA-Z]/g, '').slice(0, 20) || 'Curate';
  switch (service) {
    case 'tubi':
      return {
        startUrl: 'https://tubitv.com/signup',
        goal: [
          'Create a new free Tubi account on this signup page.',
          `Enter first name "${firstName}". ${creds}`,
          'Then click the "Register via Email" button (NOT "Continue with Google" / "Continue with Apple").',
          'After submitting, Tubi asks for Age and Gender: enter age 25 and pick any gender option, then click Continue.',
          'You are done once the account is created and you land on the Tubi home page (tubitv.com).',
          'This is a FREE account — never enter any payment or credit card information.',
          'If a CAPTCHA or "verify you are human" check blocks progress, stop and report that you were blocked.',
        ].join(' '),
      };
    case 'netflix':
      return {
        startUrl: 'https://www.netflix.com/signup',
        goal: [
          'Begin signing up for Netflix on the cheapest plan ("Standard with ads").',
          `${creds}`,
          'Work through the steps: continue past the intro, select the Standard with ads plan, create the account with the email and password above, and skip email verification if offered.',
          'STOP as soon as you reach the payment / "choose how to pay" / credit-card screen.',
          'Do NOT enter any credit card or payment details, and do NOT click "Start Membership" or any final submit. Reaching the payment screen IS success — report that you reached it.',
          'If a CAPTCHA or human-verification check blocks progress, stop and report it.',
        ].join(' '),
      };
    case 'disney':
      return {
        startUrl: 'https://www.disneyplus.com/sign-up',
        goal: `Begin a Disney+ signup for the cheapest monthly plan. ${creds} Proceed to the payment page and then STOP — do NOT submit payment.`,
      };
    case 'hulu':
      return {
        startUrl: 'https://www.hulu.com/signup',
        goal: `Begin a Hulu signup for the cheapest ad-supported plan. ${creds} Proceed to the payment page and then STOP — do NOT submit payment.`,
      };
    case 'max':
      return {
        startUrl: 'https://www.max.com/subscribe',
        goal: `Begin a Max signup for the cheapest "Basic With Ads" monthly plan. ${creds} Proceed to the payment page and then STOP — do NOT submit payment.`,
      };
    default:
      return null;
  }
}

function startComputerUseRun({ service, email, password }) {
  const preset = computerUsePreset(service, { email, password });
  const run = createRun(service, 'computer-use');
  if (!preset) {
    pushStep(run, `No computer-use preset for ${service}`);
    finishRun(run, { error: new Error(`Unsupported service: ${service}`) });
    return run;
  }
  pushStep(run, `Gemini Computer Use will sign up for ${service}`);
  // Fire-and-forget; the frontend polls the run for live frames.
  runComputerUse({ run, goal: preset.goal, startUrl: preset.startUrl }).catch((err) => {
    pushStep(run, `Fatal: ${err.message}`);
    finishRun(run, { error: err });
  });
  return run;
}

module.exports = { startDemoRun, startComputerUseRun };
