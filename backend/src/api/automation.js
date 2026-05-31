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

// POST /api/automation/:service  { action: 'subscribe'|'unsubscribe', email, password }
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
