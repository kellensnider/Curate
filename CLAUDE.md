# Curate — Claude Code Master Brief

## What we're building
Curate is a streaming subscription management tool built for QuackHacks 3.
Users rank a watchlist of shows/movies. A Claude agent analyzes their list,
determines which 1–2 streaming services cover the most titles, and manages
subscription switching month-to-month.

**The winning demo moment:** User ranks their watchlist → agent says
"Cancel Max this month — 11 of your top 15 titles are on Hulu. You'd save $17.99."

---

## Tech stack (do not deviate without asking)

| Layer | Choice | Reason |
|---|---|---|
| Frontend | Next.js 14 (App Router) + Tailwind CSS | Fast scaffolding, easy deploy |
| Backend | Node.js + Express | Simple REST API |
| Agent | Anthropic SDK (claude-sonnet-4-20250514) | Tool use / agent loop |
| MCP Server | `@modelcontextprotocol/sdk` | Subscription management tools |
| Database | MongoDB via Mongoose | Flexible document model for demo state |
| Seed data | `/data/shows.json` | Curated, no external API needed |

---

## Project structure

```
curate/
├── CLAUDE.md               ← you are here
├── ARCHITECTURE.md         ← system design reference
├── data/
│   └── shows.json          ← seed database (80+ titles)
├── backend/
│   ├── package.json
│   └── src/
│       ├── index.js        ← Express server entry
│       ├── config/
│       │   └── db.js       ← MongoDB connection
│       ├── models/         ← Mongoose models
│       ├── seed/
│       │   └── seedDemoData.js ← seed loader
│       ├── api/
│       │   ├── watchlist.js ← CRUD for user watchlist
│       │   ├── shows.js     ← show search/browse
│       │   └── subscriptions.js ← subscription state
│       ├── agent/
│       │   └── index.js    ← Claude agent with tool loop
│       └── mcp/
│           └── server.js   ← MCP server + tool definitions
└── frontend/
    ├── package.json
    └── src/
        ├── app/
        │   ├── page.jsx         ← watchlist + ranking UI
        │   ├── recommend/page.jsx ← recommendation results
        │   └── agent/page.jsx   ← agent chat interface
        ├── components/
        │   ├── WatchlistItem.jsx
        │   ├── ServiceCard.jsx
        │   └── AgentMessage.jsx
        ├── hooks/
        │   └── useWatchlist.js
        └── lib/
            └── api.js          ← fetch wrapper for backend
```

---

## Data model

### shows.json shape
```json
{
  "id": "tt0903747",
  "title": "Breaking Bad",
  "type": "series",
  "genre": ["drama", "crime"],
  "year": 2008,
  "services": ["netflix"],
  "priority_weight": 9
}
```

### MongoDB collections

- `users`: one seeded demo user with preferences
- `shows`: seeded from `data/shows.json`
- `watchlistitems`: ranked user watchlist, populated with `Show`
- `subscriptions`: simulated subscription state and monthly costs
- `agentrecommendations`: stored recommendation output
- `agentactions`: simulated agent subscription changes

---

## Agent design

The Claude agent receives the user's ranked watchlist and current subscriptions,
then uses tools to reason about and update subscriptions.

### MCP Tools the agent has access to

```
get_watchlist()
  → Returns ranked watchlist with show details + service coverage

get_subscriptions()
  → Returns current active subscriptions + monthly costs

analyze_coverage(service_list: string[])
  → Returns how many watchlist titles each service covers, weighted by rank

recommend_subscriptions()
  → Agent's core reasoning tool: returns recommended 1-2 services + savings

activate_subscription(service: string)
  → Marks a service as active in DB

cancel_subscription(service: string)
  → Marks a service as cancelled in DB

get_service_prices()
  → Returns monthly costs for all services
```

### Agent system prompt (use this exactly)
```
You are Curate, an AI subscription manager. Your job is to analyze
the user's ranked watchlist and recommend the optimal 1-2 streaming services
for this month to maximize coverage of their most-wanted content while
minimizing cost.

When making recommendations:
1. Weight titles by their rank (rank 1 = most important)
2. Always show your reasoning: which titles each service covers
3. Calculate the exact monthly savings vs. their current setup
4. Be direct and specific — name the services, name the titles, name the dollar amounts
5. After recommending, ask if they want you to make the changes

You have tools to read their watchlist, analyze service coverage, and
activate/cancel subscriptions. Use them before responding.
```

---

## API endpoints (backend)

```
GET  /api/shows?q=breaking+bad     → search shows
GET  /api/shows/popular             → top shows for onboarding

GET  /api/watchlist/:userId         → get ranked watchlist
POST /api/watchlist/:userId         → add show to watchlist
PUT  /api/watchlist/:userId/rank    → reorder (body: [{show_id, rank}])
DELETE /api/watchlist/:userId/:showId → remove show

GET  /api/subscriptions/:userId     → get subscription state
POST /api/agent/chat                → send message to agent (streaming)
```

---

## Services + pricing reference

```js
const SERVICE_PRICES = {
  netflix:   { name: 'Netflix',           monthly: 15.49 },
  hulu:      { name: 'Hulu',              monthly: 17.99 },
  disney:    { name: 'Disney+',           monthly: 13.99 },
  max:       { name: 'Max',               monthly: 15.99 },
  peacock:   { name: 'Peacock',           monthly: 7.99  },
  prime:     { name: 'Prime Video',       monthly: 8.99  },
  appletv:   { name: 'Apple TV+',         monthly: 9.99  },
  paramount: { name: 'Paramount+',        monthly: 7.99  },
};
```

---

## Build order (follow this sequence)

### Phase 1 — Data + DB (start here)
1. Create `data/shows.json` with 80+ seeded titles
2. Set up MongoDB connection, Mongoose models, and seed loader
3. Seed demo user (id=1) with 3 active subscriptions

### Phase 2 — Backend API
4. Express server with all API routes
5. Watchlist CRUD working end-to-end
6. Subscriptions read/write working

### Phase 3 — MCP Server + Agent
7. MCP server with all tools defined
8. Agent loop with streaming responses
9. `/api/agent/chat` endpoint

### Phase 4 — Frontend
10. Watchlist page with drag-to-rank
11. Service recommendation display
12. Agent chat interface

### Phase 5 — Integration + Polish
13. Wire frontend to backend
14. Full demo flow working
15. Error handling + loading states

---

## Demo flow script (the judging path)

1. User opens app — sees empty watchlist
2. Searches for "Breaking Bad" → adds it (rank 1)
3. Adds 8 more shows across different services
4. Clicks "Optimize My Subscriptions"
5. Agent analyzes, streams its reasoning, delivers recommendation
6. Agent: "Cancel Max, keep Netflix + Hulu. Covers 8/9 titles. Save $15.99/mo."
7. User clicks "Apply Changes" → agent executes subscription updates
8. Dashboard shows new subscription state + monthly savings

---

## Hackathon constraints

- **No real payment/account APIs.** Subscription state is simulated in MongoDB.
- **Single user only.** No auth. `/api/.../1` resolves to the seeded demo user.
- **No external show API.** All data comes from `shows.json`.
- **Feature freeze at hour 16.** After that, polish only.
- **Must work offline** (except Anthropic API calls).

---

## First command to run

```bash
# From project root
cd backend && npm init -y && npm install express mongoose cors dotenv @anthropic-ai/sdk @modelcontextprotocol/sdk
cd ../frontend && npx create-next-app@latest . --tailwind --app --no-typescript --no-eslint --src-dir
```

---

## Environment variables needed

Create `backend/.env`:
```
ANTHROPIC_API_KEY=your_key_here
PORT=3001
MONGO_URI=mongodb://localhost:27017/curate
```

Create `frontend/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## When you are ready to start

Read this file completely first. Then begin with Phase 1:
create `data/shows.json` with 80 titles covering all 8 services,
then set up the MongoDB model layer. Do not skip ahead.
