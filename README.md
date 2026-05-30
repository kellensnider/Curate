# Curate 🎬

> AI-powered streaming subscription manager — QuackHacks 3

Curate analyzes your ranked watchlist and tells you exactly which 1–2 streaming services to keep this month. A Claude agent manages the switching for you.

---

## Quick start

### 1. Clone and install

```bash
# Backend
cd backend
cp .env.example .env
# Add your MONGO_URI and ANTHROPIC_API_KEY to .env
npm install
npm run seed

# Frontend
cd ../frontend
npm install
```

### 2. Start the backend

```bash
cd backend
npm run dev
# → http://localhost:3001
```

### 3. Start the frontend

```bash
cd frontend
npm run dev
# → http://localhost:3000
```

### 4. Verify everything works

```bash
curl http://localhost:3001/api/health
curl http://localhost:3001/api/shows/popular
curl http://localhost:3001/api/subscriptions/1
```

---

## Demo flow

1. Open `http://localhost:3000`
2. Search for shows and add them to your watchlist
3. Drag to rank them (most-wanted at top)
4. Click **"Optimize My Subscriptions"**
5. Watch the agent analyze your list and deliver a recommendation
6. Approve the changes — agent executes subscription updates

---

## Project structure

```
curate/
├── CLAUDE.md          ← Claude Code master brief (read first)
├── ARCHITECTURE.md    ← System design reference
├── data/
│   └── shows.json     ← 80+ seeded titles across 8 services
├── backend/           ← Express + MongoDB + Claude Agent
└── frontend/          ← Next.js + Tailwind
```

---

## Tech stack

- **Frontend:** Next.js 14 (App Router) + Tailwind CSS + @dnd-kit
- **Backend:** Node.js + Express
- **Agent:** Anthropic SDK (claude-sonnet-4-20250514) with tool use
- **MCP:** @modelcontextprotocol/sdk for subscription tools
- **Database:** MongoDB via Mongoose

---

## Hackathon notes

- Subscription actions are **simulated** in MongoDB (no real billing APIs)
- Single user only — `/api/.../1` resolves to the seeded demo user, no auth needed
- Show data starts from local `shows.json`; optional JustWatch ingestion writes `data/justwatch_shows.json`
- Agent streams responses via Server-Sent Events

## JustWatch Refresh

```bash
cd backend
cd ingest
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cd ..
npm run refresh:catalog
npm run verify:catalog
```

The JustWatch integration uses an unofficial Python API and currently maps only
Curate's 8 supported streaming providers.

---

Built for **QuackHacks 3** at the University of Oregon 🦆
