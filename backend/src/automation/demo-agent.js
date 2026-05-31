#!/usr/bin/env node
/**
 * Headed computer-use demo runner (any service).
 *
 *   npm run demo:tubi    -- <email> <password>
 *   npm run demo:netflix -- <email> <password>
 *   node src/automation/demo-agent.js <service> <email> <password>
 *
 * Forces a VISIBLE browser (AUTOMATION_HEADLESS=false) with slow-mo so the
 * audience can watch Gemini 2.5 Computer Use (on Vertex AI) navigate the real
 * signup with your email + password. Prints each reasoning step live.
 *
 * Tubi is free (completes for real). Netflix/Disney/Hulu/Max are instructed to
 * drive to the payment screen and STOP — no card entered, no charge.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Force a visible, demo-paced browser before the agent reads these.
process.env.AUTOMATION_HEADLESS = 'false';
if (!process.env.BROWSER_SLOWMO) process.env.BROWSER_SLOWMO = '350';

const { startComputerUseRun } = require('./demo');

const SERVICES = ['tubi', 'netflix', 'disney', 'hulu', 'max'];
const service = (process.argv[2] || '').toLowerCase();
const email = process.argv[3] || process.env.DEMO_EMAIL;
const password = process.argv[4] || process.env.DEMO_PASSWORD;

if (!SERVICES.includes(service)) {
  console.error(`First arg must be a service: ${SERVICES.join(', ')}`);
  process.exit(1);
}
if (!email || !password) {
  console.error(`Usage: node src/automation/demo-agent.js ${service} <email> <password>`);
  console.error('   or: set DEMO_EMAIL and DEMO_PASSWORD in the environment.');
  process.exit(1);
}
if (!process.env.GCP_PROJECT_ID) {
  console.error('GCP_PROJECT_ID is not set — the computer-use agent needs Vertex. Check backend/.env.');
  process.exit(1);
}

const stops = service === 'tubi' ? 'create a real free account' : 'drive to the payment screen and STOP (no charge)';
console.log(`\n🎬 Headed ${service} demo — Gemini Computer Use will ${stops} for ${email}\n`);

const run = startComputerUseRun({ service, email, password });

let printed = 0;
const timer = setInterval(() => {
  for (; printed < run.steps.length; printed++) {
    console.log(`  ${printed + 1}. ${run.steps[printed].label}`);
  }
  if (run.status !== 'running') {
    clearInterval(timer);
    console.log(`\nStatus: ${run.status}  |  frames captured: ${run.frames.length}`);
    if (run.result) console.log('Result:', run.result.message || JSON.stringify(run.result));
    if (run.error) console.log('Error:', run.error);
    console.log('\nFrames are in backend/screenshots/ and stream to the dashboard filmstrip.');
    process.exit(run.status === 'done' ? 0 : 1);
  }
}, 1000);
