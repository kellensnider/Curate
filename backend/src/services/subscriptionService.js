const { Subscription, SERVICE_PRICES } = require('../models');

const ACTIVE_DEFAULT_SERVICES = new Set(['netflix', 'max', 'disney']);

async function ensureDefaultSubscriptions(userId) {
  const writes = Object.entries(SERVICE_PRICES).map(([service, price]) => ({
    updateOne: {
      filter: { userId, service },
      update: {
        $setOnInsert: {
          userId,
          service,
          displayName: price.name,
          status: ACTIVE_DEFAULT_SERVICES.has(service) ? 'active' : 'cancelled',
          monthlyCost: price.monthly,
          updatedAt: new Date(),
        },
      },
      upsert: true,
    },
  }));

  if (writes.length) {
    await Subscription.bulkWrite(writes);
  }
}

module.exports = { ensureDefaultSubscriptions, ACTIVE_DEFAULT_SERVICES };
