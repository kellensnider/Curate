# Curate — Architecture Reference

## System overview

```
User Browser
     │
     ▼
Next.js Frontend (port 3000)
     │  REST + streaming fetch
     ▼
Express Backend (port 3001)
     ├── /api/shows          ← show search from JSON
     ├── /api/watchlist      ← MongoDB CRUD
     ├── /api/subscriptions  ← MongoDB CRUD
     └── /api/agent/chat     ← proxies to Claude agent
          │
          ▼
     Claude Agent (Anthropic SDK)
          │  tool_use calls
          ▼
     MCP Server (local, in-process)
          │  reads/writes
          ▼
     MongoDB collections seeded from shows.json
```

## Agent tool call flow

```
User: "Optimize my subscriptions"
  │
  ▼
Agent receives message + system prompt
  │
  ├─► get_watchlist()        → [{title, rank, services[]}, ...]
  ├─► get_subscriptions()    → [{service, status, cost}, ...]
  ├─► analyze_coverage(...)  → {netflix: {count: 6, weighted_score: 84}, ...}
  └─► recommend_subscriptions() → {keep: [...], cancel: [...], savings: 15.99}
  │
  ▼
Agent streams recommendation text to user
  │
User: "Yes, apply the changes"
  │
  ├─► cancel_subscription("max")
  └─► activate_subscription("hulu")
  │
  ▼
Agent confirms: "Done. You're now subscribed to Netflix + Hulu."
```

## Key design decisions

**Why MCP for subscription management?**
MCP gives the agent a clean tool interface with defined inputs/outputs.
It also makes a great demo talking point — judges understand "it has tools
it can call" immediately.

**Why MongoDB?**
Mongoose gives the app a flexible document model for ranked watchlists,
simulated subscription state, and stored agent recommendations.
The demo still uses local seed data from `data/shows.json`.

**Why simulate subscription actions?**
No streaming service exposes a public "cancel my subscription" API.
We simulate it cleanly in MongoDB and call it out upfront in the pitch —
"in production, this would integrate with billing APIs."

**Why Next.js App Router?**
Streaming responses from the agent can be piped directly using
Server-Sent Events or the Vercel AI SDK's `useChat` hook if needed.

## Drag-to-rank implementation

Use `@dnd-kit/core` and `@dnd-kit/sortable` for drag-and-drop.
On drop, fire `PUT /api/watchlist/:userId/rank` with the new order.
The `rank` field on `WatchlistItem` is the source of truth.

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

## Agent streaming

Use Anthropic SDK with `stream: true`. Pipe the stream through
the Express response as Server-Sent Events:

```js
res.setHeader('Content-Type', 'text/event-stream');
res.setHeader('Cache-Control', 'no-cache');

const stream = await anthropic.messages.stream({ ... });
for await (const chunk of stream) {
  if (chunk.type === 'content_block_delta') {
    res.write(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`);
  }
}
res.write('data: [DONE]\n\n');
res.end();
```

## Coverage scoring algorithm

```js
function scoreServices(watchlist, services) {
  const scores = {};
  for (const service of Object.keys(SERVICE_PRICES)) {
    scores[service] = { count: 0, weighted: 0, titles: [] };
  }
  
  for (const item of watchlist) {
    const weight = (watchlist.length - item.rank + 1); // rank 1 = highest weight
    for (const service of item.show.services) {
      scores[service].count++;
      scores[service].weighted += weight;
      scores[service].titles.push(item.show.title);
    }
  }
  
  return scores;
}

function recommend(watchlist) {
  const scores = scoreServices(watchlist);
  const sorted = Object.entries(scores).sort((a, b) => b[1].weighted - a[1].weighted);
  
  // Try all 1-service and 2-service combos to find max coverage
  // Return the combo with best coverage-to-cost ratio
}
```
