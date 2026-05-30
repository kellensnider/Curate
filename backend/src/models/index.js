const User = require('./User');
const Show = require('./Show');
const WatchlistItem = require('./WatchlistItem');
const Subscription = require('./Subscription');
const AgentRecommendation = require('./AgentRecommendation');
const AgentAction = require('./AgentAction');

const SERVICE_PRICES = {
  netflix: { name: 'Netflix', monthly: 15.49 },
  hulu: { name: 'Hulu', monthly: 17.99 },
  disney: { name: 'Disney+', monthly: 13.99 },
  max: { name: 'Max', monthly: 15.99 },
  peacock: { name: 'Peacock', monthly: 7.99 },
  prime: { name: 'Prime Video', monthly: 8.99 },
  appletv: { name: 'Apple TV+', monthly: 9.99 },
  paramount: { name: 'Paramount+', monthly: 7.99 },
};

function serializeShow(show) {
  if (!show) return null;
  const doc = typeof show.toObject === 'function' ? show.toObject() : show;

  return {
    _id: doc._id,
    id: doc.externalId,
    externalId: doc.externalId,
    source: doc.source,
    title: doc.title,
    type: doc.type,
    genre: doc.genre || [],
    year: doc.year,
    services: doc.services || [],
    offers: doc.offers || [],
    priority_weight: doc.priorityWeight,
    priorityWeight: doc.priorityWeight,
  };
}

async function resolveDemoUserId(userId) {
  if (String(userId) !== '1') return userId;

  const demoUser = await User.findOne().sort({ createdAt: 1 }).select('_id');
  return demoUser?._id;
}

module.exports = {
  User,
  Show,
  WatchlistItem,
  Subscription,
  AgentRecommendation,
  AgentAction,
  SERVICE_PRICES,
  serializeShow,
  resolveDemoUserId,
};
