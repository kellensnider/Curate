# Curate

> AI-powered streaming subscription manager for QuackHacks 3

Curate analyzes your ranked watchlist and tells you exactly which 1-2 streaming services to keep this month. A Claude agent manages the switching for you.

---

## Quick Start

### 1. Install

```bash
# Backend
cd backend
cp .env.example .env
# Add MONGO_URI, JWT_SECRET, and ANTHROPIC_API_KEY to .env
npm install
npm run seed:demo-user

# Frontend
cd ../frontend
npm install
```

### 2. Start The Backend

```bash
cd backend
npm run dev
# http://localhost:3001
```

### 3. Start The Frontend

```bash
cd frontend
npm run dev
# http://localhost:3000
```

### 4. Verify

```bash
curl http://localhost:3001/api/health
curl http://localhost:3001/api/shows/popular
```

Create or log in, then use the returned token for user-specific routes:

```bash
curl -X POST http://localhost:3001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Chris","email":"chris@example.com","password":"password123"}'

curl http://localhost:3001/api/subscriptions \
  -H "Authorization: Bearer TOKEN_HERE"
```

---

## Demo Flow

1. Open `http://localhost:3000`
2. Sign up or log in
3. Search for shows and add them to your watchlist
4. Rank your watchlist
5. Click through the optimization flow
6. Approve the changes and the agent executes simulated subscription updates

---

## Project Structure

```text
curate/
├── CLAUDE.md
├── ARCHITECTURE.md
├── data/
│   └── shows.json
├── backend/
└── frontend/
```

---

## Tech Stack

- Frontend: Next.js 14 App Router + Tailwind CSS
- Backend: Node.js + Express
- Agent: Anthropic SDK with tool use
- MCP: `@modelcontextprotocol/sdk` for subscription tools
- Database: MongoDB via Mongoose
- Auth: bcrypt password hashing + JWT

---

## Auth API

The backend sets an httpOnly `token` cookie and also returns the JWT in JSON. The frontend sends credentials with requests and stores the token in `localStorage` as a hackathon-friendly fallback for the `Authorization: Bearer` header.

```bash
curl -X POST http://localhost:3001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Chris","email":"chris@example.com","password":"password123"}'

curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"chris@example.com","password":"password123"}'

curl http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer TOKEN_HERE"

curl http://localhost:3001/api/subscriptions \
  -H "Authorization: Bearer TOKEN_HERE"
```

Legacy demo routes like `/api/watchlist/1` and `/api/subscriptions/1` still resolve to the first seeded user for compatibility. The frontend uses the authenticated routes without a user id.

---

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

The JustWatch integration uses an unofficial Python API and currently maps only Curate's 8 supported streaming providers.

---

## Hackathon Notes

- Subscription actions are simulated in MongoDB. There are no real payment APIs.
- Auth is real enough for the demo, but intentionally simple.
- Show data starts from local `shows.json`; optional JustWatch ingestion writes `data/justwatch_shows.json`.
- Agent responses stream via Server-Sent Events.

Built for QuackHacks 3 at the University of Oregon.
