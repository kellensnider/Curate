const express = require('express');
const router = express.Router();
const { Subscription, SERVICE_PRICES, resolveDemoUserId } = require('../models');

function serializeSubscription(subscription) {
  return {
    _id: subscription._id,
    userId: subscription.userId,
    service: subscription.service,
    displayName: subscription.displayName,
    status: subscription.status,
    monthlyCost: subscription.monthlyCost,
    monthly_cost: subscription.monthlyCost,
    updatedAt: subscription.updatedAt,
  };
}

// GET /api/subscriptions/prices - all service prices
router.get('/prices/all', (req, res) => {
  res.json(SERVICE_PRICES);
});

// GET /api/subscriptions/:userId
router.get('/:userId', async (req, res) => {
  const userId = await resolveDemoUserId(req.params.userId);
  if (!userId) {
    return res.json({ subscriptions: [], active_count: 0, monthly_total: 0 });
  }

  const subs = await Subscription.find({ userId }).sort({ service: 1 });
  const subscriptions = subs
    .map(serializeSubscription)
    .sort((a, b) => {
      if (a.status === b.status) return a.service.localeCompare(b.service);
      return a.status === 'active' ? -1 : 1;
    });

  const active = subscriptions.filter(s => s.status === 'active');
  const totalCost = active.reduce((sum, s) => sum + s.monthlyCost, 0);

  res.json({
    subscriptions,
    active_count: active.length,
    monthly_total: Math.round(totalCost * 100) / 100,
  });
});

// POST /api/subscriptions/:userId/activate
router.post('/:userId/activate', async (req, res) => {
  const { service } = req.body;
  if (!service || !SERVICE_PRICES[service]) {
    return res.status(400).json({ error: 'Invalid service' });
  }

  const userId = await resolveDemoUserId(req.params.userId);
  if (!userId) return res.status(404).json({ error: 'User not found. Run npm run seed first.' });

  await Subscription.findOneAndUpdate(
    { userId, service },
    {
      $set: {
        displayName: SERVICE_PRICES[service].name,
        status: 'active',
        monthlyCost: SERVICE_PRICES[service].monthly,
        updatedAt: new Date(),
      },
    },
    { upsert: true, new: true }
  );

  res.json({ success: true, service, status: 'active', cost: SERVICE_PRICES[service].monthly });
});

// POST /api/subscriptions/:userId/cancel
router.post('/:userId/cancel', async (req, res) => {
  const { service } = req.body;
  if (!service) return res.status(400).json({ error: 'service required' });

  const userId = await resolveDemoUserId(req.params.userId);
  if (!userId) return res.status(404).json({ error: 'User not found. Run npm run seed first.' });

  await Subscription.updateOne(
    { userId, service },
    { $set: { status: 'cancelled', updatedAt: new Date() } }
  );

  res.json({ success: true, service, status: 'cancelled' });
});

module.exports = router;
