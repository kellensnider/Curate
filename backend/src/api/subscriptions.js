const express = require('express');
const router = express.Router();
const { db, SERVICE_PRICES } = require('../db/schema');

// GET /api/subscriptions/:userId
router.get('/:userId', (req, res) => {
  const subs = db.prepare(`
    SELECT * FROM subscriptions WHERE user_id = ? ORDER BY status DESC, service ASC
  `).all(req.params.userId);

  const active = subs.filter(s => s.status === 'active');
  const totalCost = active.reduce((sum, s) => sum + s.monthly_cost, 0);

  res.json({
    subscriptions: subs,
    active_count: active.length,
    monthly_total: Math.round(totalCost * 100) / 100,
  });
});

// POST /api/subscriptions/:userId/activate
router.post('/:userId/activate', (req, res) => {
  const { service } = req.body;
  if (!service || !SERVICE_PRICES[service]) {
    return res.status(400).json({ error: 'Invalid service' });
  }

  db.prepare(`
    INSERT INTO subscriptions (user_id, service, status, monthly_cost)
    VALUES (?, ?, 'active', ?)
    ON CONFLICT(user_id, service) DO UPDATE SET status='active', updated_at=CURRENT_TIMESTAMP
  `).run(req.params.userId, service, SERVICE_PRICES[service]);

  res.json({ success: true, service, status: 'active', cost: SERVICE_PRICES[service] });
});

// POST /api/subscriptions/:userId/cancel
router.post('/:userId/cancel', (req, res) => {
  const { service } = req.body;
  if (!service) return res.status(400).json({ error: 'service required' });

  db.prepare(`
    UPDATE subscriptions SET status='cancelled', updated_at=CURRENT_TIMESTAMP
    WHERE user_id = ? AND service = ?
  `).run(req.params.userId, service);

  res.json({ success: true, service, status: 'cancelled' });
});

// GET /api/subscriptions/prices - all service prices
router.get('/prices/all', (req, res) => {
  res.json(SERVICE_PRICES);
});

module.exports = router;
