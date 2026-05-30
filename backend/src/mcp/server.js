const { db, SERVICE_PRICES } = require('../db/schema');
const shows = require('../../../data/shows.json');

const showsMap = Object.fromEntries(shows.map(s => [s.id, s]));

// MCP tool definitions — these are passed to the Claude API as tools
const MCP_TOOLS = [
  {
    name: 'get_watchlist',
    description: 'Get the user\'s ranked watchlist with show details and streaming service coverage. Returns shows ordered by rank (1 = highest priority).',
    input_schema: {
      type: 'object',
      properties: {
        user_id: { type: 'number', description: 'The user ID (use 1 for demo)' }
      },
      required: ['user_id']
    }
  },
  {
    name: 'get_subscriptions',
    description: 'Get the user\'s current streaming subscriptions, including active and cancelled services with monthly costs.',
    input_schema: {
      type: 'object',
      properties: {
        user_id: { type: 'number', description: 'The user ID (use 1 for demo)' }
      },
      required: ['user_id']
    }
  },
  {
    name: 'analyze_coverage',
    description: 'Analyze how many watchlist titles each streaming service covers, weighted by rank. Higher-ranked titles count for more. Returns coverage scores for all services.',
    input_schema: {
      type: 'object',
      properties: {
        user_id: { type: 'number', description: 'The user ID (use 1 for demo)' }
      },
      required: ['user_id']
    }
  },
  {
    name: 'get_service_prices',
    description: 'Get the monthly subscription cost for all streaming services.',
    input_schema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'activate_subscription',
    description: 'Activate a streaming subscription for the user.',
    input_schema: {
      type: 'object',
      properties: {
        user_id: { type: 'number' },
        service: { type: 'string', description: 'Service key: netflix, hulu, disney, max, peacock, prime, appletv, paramount' }
      },
      required: ['user_id', 'service']
    }
  },
  {
    name: 'cancel_subscription',
    description: 'Cancel a streaming subscription for the user.',
    input_schema: {
      type: 'object',
      properties: {
        user_id: { type: 'number' },
        service: { type: 'string', description: 'Service key: netflix, hulu, disney, max, peacock, prime, appletv, paramount' }
      },
      required: ['user_id', 'service']
    }
  }
];

// Tool execution handlers
function executeTool(toolName, input) {
  switch (toolName) {
    case 'get_watchlist': {
      const items = db.prepare(`
        SELECT * FROM watchlist WHERE user_id = ? ORDER BY rank ASC
      `).all(input.user_id);

      return items.map(item => ({
        rank: item.rank,
        show_id: item.show_id,
        title: showsMap[item.show_id]?.title || 'Unknown',
        services: showsMap[item.show_id]?.services || [],
        genre: showsMap[item.show_id]?.genre || [],
        type: showsMap[item.show_id]?.type || 'unknown',
      }));
    }

    case 'get_subscriptions': {
      const subs = db.prepare(`
        SELECT * FROM subscriptions WHERE user_id = ? ORDER BY status DESC
      `).all(input.user_id);

      const active = subs.filter(s => s.status === 'active');
      return {
        all: subs,
        active,
        monthly_total: active.reduce((sum, s) => sum + s.monthly_cost, 0).toFixed(2),
      };
    }

    case 'analyze_coverage': {
      const watchlist = db.prepare(`
        SELECT * FROM watchlist WHERE user_id = ? ORDER BY rank ASC
      `).all(input.user_id);

      const totalItems = watchlist.length;
      const scores = {};

      for (const [service] of Object.entries(SERVICE_PRICES)) {
        scores[service] = { count: 0, weighted_score: 0, titles: [], cost: SERVICE_PRICES[service] };
      }

      for (const item of watchlist) {
        const show = showsMap[item.show_id];
        if (!show) continue;
        // Higher rank = lower number = higher weight
        const weight = totalItems - item.rank + 1;
        for (const service of show.services) {
          if (scores[service]) {
            scores[service].count++;
            scores[service].weighted_score += weight;
            scores[service].titles.push(show.title);
          }
        }
      }

      // Calculate coverage %
      for (const service of Object.keys(scores)) {
        scores[service].coverage_pct = totalItems > 0
          ? Math.round((scores[service].count / totalItems) * 100)
          : 0;
      }

      return {
        total_watchlist_items: totalItems,
        scores: Object.entries(scores)
          .sort((a, b) => b[1].weighted_score - a[1].weighted_score)
          .map(([service, data]) => ({ service, ...data }))
      };
    }

    case 'get_service_prices': {
      return SERVICE_PRICES;
    }

    case 'activate_subscription': {
      const { user_id, service } = input;
      if (!SERVICE_PRICES[service]) return { error: `Unknown service: ${service}` };

      db.prepare(`
        INSERT INTO subscriptions (user_id, service, status, monthly_cost)
        VALUES (?, ?, 'active', ?)
        ON CONFLICT(user_id, service) DO UPDATE SET status='active', updated_at=CURRENT_TIMESTAMP
      `).run(user_id, service, SERVICE_PRICES[service]);

      return { success: true, service, status: 'active', monthly_cost: SERVICE_PRICES[service] };
    }

    case 'cancel_subscription': {
      const { user_id, service } = input;

      db.prepare(`
        UPDATE subscriptions SET status='cancelled', updated_at=CURRENT_TIMESTAMP
        WHERE user_id = ? AND service = ?
      `).run(user_id, service);

      return { success: true, service, status: 'cancelled' };
    }

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

module.exports = { MCP_TOOLS, executeTool };
