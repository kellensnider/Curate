const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { runTubiAction } = require('../automation/tubi');

// Hard off-switch. Real browser automation against third-party sites is only
// run when AUTOMATION_ENABLED=true (testing, with your OWN accounts). The live
// API has this disabled, so the route is a no-op there.
const ENABLED = process.env.AUTOMATION_ENABLED === 'true';

const SERVICE_RUNNERS = {
  tubi: runTubiAction,
};

// ─── Live demo: multi-service browser flows with filmstrip streaming ──────────
const { startDemoRun, startComputerUseRun } = require('../automation/demo');
const { getRun, listRuns } = require('../automation/runs');

const DEMO_SERVICES = ['netflix', 'disney', 'hulu', 'max', 'tubi'];

// POST /api/automation/demo  { service, action?, password?, payment_method? }
// Starts a real headed/headless browser run and returns a runId immediately.
// The browser opens, navigates the signup, and (Tubi) signs in for real; other
// services stop at the filled payment screen. Poll GET .../runs/:id to watch.
router.post('/demo', requireAuth, async (req, res) => {
  if (!ENABLED) {
    return res.status(403).json({ error: 'Automation is disabled. Set AUTOMATION_ENABLED=true (testing only).' });
  }
  const { service, action = 'subscribe', password, payment_method } = req.body || {};
  if (!DEMO_SERVICES.includes(service)) {
    return res.status(400).json({ error: `service must be one of: ${DEMO_SERVICES.join(', ')}` });
  }
  // Email is the authenticated identity (can't be spoofed); password is the
  // streaming-account password to use (defaults to the user's Curate password).
  const email = req.user.email;
  const pw = password || req.user.email; // caller should pass a real password for live signin
  if (!email) return res.status(400).json({ error: 'authenticated email required' });

  const run = startDemoRun({ service, action, email, password: pw, paymentMethod: payment_method });
  return res.status(202).json({ runId: run.id, service: run.service, action: run.action, status: run.status });
});

// POST /api/automation/agent  { service, password? }
// The Gemini Computer Use agent (on Vertex AI) drives a real browser to sign up.
// Returns a runId immediately; poll GET .../runs/:id to watch it navigate live.
router.post('/agent', requireAuth, async (req, res) => {
  if (!ENABLED) {
    return res.status(403).json({ error: 'Automation is disabled. Set AUTOMATION_ENABLED=true (testing only).' });
  }
  const { service, password } = req.body || {};
  if (!DEMO_SERVICES.includes(service)) {
    return res.status(400).json({ error: `service must be one of: ${DEMO_SERVICES.join(', ')}` });
  }
  const email = req.user.email;
  const pw = password || req.user.email;
  if (!email) return res.status(400).json({ error: 'authenticated email required' });

  const run = startComputerUseRun({ service, email, password: pw });
  return res.status(202).json({ runId: run.id, service: run.service, action: run.action, status: run.status });
});

// GET /api/automation/runs/:runId — poll a run's status, steps, and frames.
router.get('/runs/:runId', requireAuth, (req, res) => {
  const run = getRun(req.params.runId);
  if (!run) return res.status(404).json({ error: 'run not found' });
  return res.json(run);
});

// GET /api/automation/runs — recent runs (most recent first).
router.get('/runs', requireAuth, (req, res) => {
  return res.json({ runs: listRuns().map((r) => ({ id: r.id, service: r.service, action: r.action, status: r.status, frames: r.frames.length, startedAt: r.startedAt })) });
});

// POST /api/automation/:service  { action: 'subscribe'|'unsubscribe', password }
// Legacy scripted runner (Tubi). MUST stay last — it's a catch-all that would
// otherwise swallow the specific routes above (/demo, /agent, /runs).
// Credentials are used in-memory for this request only and never stored/logged.
router.post('/:service', requireAuth, async (req, res) => {
  if (!ENABLED) {
    return res.status(403).json({
      error: 'Automation is disabled. Set AUTOMATION_ENABLED=true (testing only).',
    });
  }

  const runner = SERVICE_RUNNERS[req.params.service];
  if (!runner) {
    return res.status(404).json({ error: `No automation runner for "${req.params.service}"` });
  }

  const { action = 'subscribe', password } = req.body || {};
  // The streaming account uses the user's Curate identity. Email comes from the
  // authenticated token (can't be spoofed); the client only supplies the
  // password to use (their Curate password).
  const email = req.user.email;
  if (!['subscribe', 'unsubscribe'].includes(action)) {
    return res.status(400).json({ error: 'action must be "subscribe" or "unsubscribe"' });
  }
  if (!email || !password) {
    return res.status(400).json({ error: 'password is required' });
  }

  try {
    const result = await runner({ action, email, password });
    return res.status(result.ok ? 200 : 422).json(result);
  } catch (err) {
    return res.status(500).json({ error: 'Automation run failed', detail: err.message });
  }
});

module.exports = router;
