const {
  Show,
  WatchlistItem,
  Subscription,
  SERVICE_PRICES,
  resolveDemoUserId,
  serializeShow,
} = require('../models');

// MCP tool definitions - these are passed to the Claude API as tools.
const MCP_TOOLS = [
  {
    name: 'get_watchlist',
    description: 'Get the user\'s ranked watchlist with show details and streaming service coverage. Returns shows ordered by rank (1 = highest priority).',
    input_schema: {
      type: 'object',
      properties: {
        user_id: { type: 'string', description: 'The authenticated MongoDB user ID' },
      },
      required: ['user_id'],
    },
  },
  {
    name: 'get_subscriptions',
    description: 'Get the user\'s current streaming subscriptions, including active and cancelled services with monthly costs.',
    input_schema: {
      type: 'object',
      properties: {
        user_id: { type: 'string', description: 'The authenticated MongoDB user ID' },
      },
      required: ['user_id'],
    },
  },
  {
    name: 'analyze_coverage',
    description: 'Analyze how many watchlist titles each streaming service covers, weighted by rank. Higher-ranked titles count for more. Returns coverage scores for all services.',
    input_schema: {
      type: 'object',
      properties: {
        user_id: { type: 'string', description: 'The authenticated MongoDB user ID' },
      },
      required: ['user_id'],
    },
  },
  {
    name: 'get_service_prices',
    description: 'Get the monthly subscription cost for all streaming services.',
    input_schema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'activate_subscription',
    description: 'Activate a streaming subscription for the user.',
    input_schema: {
      type: 'object',
      properties: {
        user_id: { type: 'string' },
        service: { type: 'string', description: 'Service key: netflix, hulu, disney, max, peacock, prime, appletv, paramount' },
      },
      required: ['user_id', 'service'],
    },
  },
  {
    name: 'cancel_subscription',
    description: 'Cancel a streaming subscription for the user.',
    input_schema: {
      type: 'object',
      properties: {
        user_id: { type: 'string' },
        service: { type: 'string', description: 'Service key: netflix, hulu, disney, max, peacock, prime, appletv, paramount' },
      },
      required: ['user_id', 'service'],
    },
  },
];

async function getUserId(inputUserId) {
  const userId = await resolveDemoUserId(inputUserId);
  if (!userId) throw new Error('User not found.');
  return userId;
}

// Tool execution handlers.
async function executeTool(toolName, input) {
  switch (toolName) {
    case 'get_watchlist': {
      const userId = await getUserId(input.user_id);
      const items = await WatchlistItem.find({ userId })
        .populate('showId')
        .sort({ rank: 1 });

      return items.map((item) => {
        const show = serializeShow(item.showId);
        return {
          rank: item.rank,
          show_id: show?.id,
          title: show?.title || 'Unknown',
          services: show?.services || [],
          genre: show?.genre || [],
          type: show?.type || 'unknown',
        };
      });
    }

    case 'get_subscriptions': {
      const userId = await getUserId(input.user_id);
      const subs = await Subscription.find({ userId }).sort({ status: -1, service: 1 });
      const all = subs.map((sub) => ({
        service: sub.service,
        displayName: sub.displayName,
        status: sub.status,
        monthly_cost: sub.monthlyCost,
        monthlyCost: sub.monthlyCost,
      }));
      const active = all.filter(s => s.status === 'active');

      return {
        all,
        active,
        monthly_total: active.reduce((sum, s) => sum + s.monthlyCost, 0).toFixed(2),
      };
    }

    case 'analyze_coverage': {
      const userId = await getUserId(input.user_id);
      const watchlist = await WatchlistItem.find({ userId })
        .populate('showId')
        .sort({ rank: 1 });

      const totalItems = watchlist.length;
      const scores = {};

      for (const [service, price] of Object.entries(SERVICE_PRICES)) {
        scores[service] = {
          count: 0,
          weighted_score: 0,
          titles: [],
          cost: price.monthly,
        };
      }

      for (const item of watchlist) {
        const show = serializeShow(item.showId);
        if (!show) continue;
        const weight = totalItems - item.rank + 1;

        for (const service of show.services) {
          if (scores[service]) {
            scores[service].count++;
            scores[service].weighted_score += weight;
            scores[service].titles.push(show.title);
          }
        }
      }

      for (const service of Object.keys(scores)) {
        scores[service].coverage_pct = totalItems > 0
          ? Math.round((scores[service].count / totalItems) * 100)
          : 0;
      }

      return {
        total_watchlist_items: totalItems,
        scores: Object.entries(scores)
          .sort((a, b) => b[1].weighted_score - a[1].weighted_score)
          .map(([service, data]) => ({ service, ...data })),
      };
    }

    case 'get_service_prices': {
      return SERVICE_PRICES;
    }

    case 'activate_subscription': {
      const { service } = input;
      if (!SERVICE_PRICES[service]) return { error: `Unknown service: ${service}` };

      const userId = await getUserId(input.user_id);
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
        { upsert: true }
      );

      return {
        success: true,
        service,
        status: 'active',
        monthly_cost: SERVICE_PRICES[service].monthly,
      };
    }

    case 'cancel_subscription': {
      const { service } = input;
      const userId = await getUserId(input.user_id);

      await Subscription.updateOne(
        { userId, service },
        { $set: { status: 'cancelled', updatedAt: new Date() } }
      );

      return { success: true, service, status: 'cancelled' };
    }

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

module.exports = { MCP_TOOLS, executeTool };
