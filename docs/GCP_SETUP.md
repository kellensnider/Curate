# Curate on Google Cloud — setup & demo runbook

Curate's agent and subscription tooling can run on Google Cloud for the GCP
track. The wiring is **toggleable and fail-safe**: with no GCP env vars set,
everything falls back to the existing Anthropic API + Render/Vercel stack, so a
misconfig can never take the live demo down.

```
┌─ Vertex AI (Model Garden) ──── Claude reasoning  (agent loop, client.js)
│        │
├─ Cloud Run: curate-mcp ─────── subscription-state tools over HTTP  → Mongo Atlas
│
└─ Browser automation ────────── DEMO: headed locally (windows pop) +
                                  live screenshot filmstrip in the dashboard
```

---

## Prerequisites

- A GCP project with billing enabled. `gcloud config set project YOUR_PROJECT_ID`.
- `gcloud auth login` and (for local Vertex calls) `gcloud auth application-default login`.
- Enable APIs:
  ```bash
  gcloud services enable aiplatform.googleapis.com run.googleapis.com \
    artifactregistry.googleapis.com cloudbuild.googleapis.com
  ```

---

## Part A — Claude agent on Vertex AI

The agent client is provider-agnostic ([backend/src/agent/client.js](../backend/src/agent/client.js)):
it uses Vertex when `CLAUDE_PROVIDER=vertex`, otherwise the Anthropic API.

1. **Request model access:** Cloud console → Vertex AI → Model Garden → find the
   Anthropic Claude model → *Enable* for your region (e.g. `us-east5`).
   ⚠️ Vertex model IDs differ from the public API (e.g. `claude-sonnet-4-5@20250929`)
   and vary by region — copy the exact ID from Model Garden.
2. **Set env** (on the backend host — Render, Cloud Run, or local `backend/.env`):
   ```
   CLAUDE_PROVIDER=vertex
   GCP_PROJECT_ID=your-project-id
   VERTEX_REGION=us-east5
   VERTEX_MODEL=claude-sonnet-4-5@20250929   # the exact Model Garden id
   ```
3. **Auth:** uses Application Default Credentials — the Cloud Run service account
   in prod, or `gcloud auth application-default login` locally. No API key needed.
4. **Restart** the backend (`npm run start` — there is no `--watch` reload for env).
   On boot you'll see `[curate-agent] provider=vertex ...`. If Vertex init fails
   it logs the reason and falls back to the Anthropic API automatically.

To revert: unset `CLAUDE_PROVIDER` (or set it to `anthropic`).

---

## Part B — Subscription MCP server on Cloud Run

[backend/src/mcp/http-server.js](../backend/src/mcp/http-server.js) serves the same
six tools as the stdio server over Streamable HTTP, so a hosted agent can call them.

1. **Deploy** (from `backend/`):
   ```bash
   gcloud run deploy curate-mcp \
     --source . --dockerfile Dockerfile.mcp \
     --region us-east5 --allow-unauthenticated \
     --set-env-vars "MONGO_URI=YOUR_ATLAS_URI,MCP_API_KEY=SOME_SECRET,DEFAULT_USER_ID=1"
   ```
   (Drop `--allow-unauthenticated` and use IAM if you'd rather gate at the
   platform layer; `MCP_API_KEY` adds an `x-api-key` shared-secret gate either way.)
2. **Verify:**
   ```bash
   curl https://<cloud-run-url>/healthz          # {"ok":true}
   curl -X POST https://<cloud-run-url>/mcp \
     -H "Content-Type: application/json" \
     -H "Accept: application/json, text/event-stream" \
     -H "x-api-key: SOME_SECRET" \
     -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
   ```
3. **Harden before public exposure:** stop defaulting `user_id` to the demo user
   for multi-user use; keep `MCP_API_KEY` set.

Run locally first: `npm run mcp:http` (reads `backend/.env`, listens on `:8080`).

---

## Part C — The live browser demo ("windows opening + signing in")

Two modes, both supported. Use **both**: headed local for the wow moment, the
filmstrip as the always-works fallback if a streaming site changes its DOM.

### Mode A — Headed local (real Chrome windows)
On the demo laptop, set in `backend/.env`:
```
AUTOMATION_ENABLED=true
AUTOMATION_HEADLESS=false      # real windows pop up
BROWSER_SLOWMO=400             # slow actions so the audience can follow
```
You need a launchable Chromium: `npm i playwright-core` already ships one in the
ms-playwright cache; if missing, `npm i playwright && npx playwright install chromium`.

### Mode B — Filmstrip (in-dashboard, cloud-safe)
The dashboard panel [LiveDemoFilmstrip](../frontend/src/components/automation/LiveDemoFilmstrip.tsx)
calls `POST /api/automation/demo` and polls `GET /api/automation/runs/:id`,
rendering captured frames live. Works headless too — set `AUTOMATION_HEADLESS=true`
and (optionally) `BROWSER_WS_ENDPOINT` to drive a remote/cloud browser.

### Which services
- **Tubi** — free, completes a **real** account create / sign-in (no card). Best
  for the "it really signs in" proof.
- **Netflix / Disney+ / Hulu / Max** — navigate the real signup and fill the
  payment screen, then **stop before submit** (no charge). Best for visual breadth.

---

## Environment variable reference

| Var | Where | Purpose |
|---|---|---|
| `CLAUDE_PROVIDER` | backend | `vertex` to use Vertex AI; else Anthropic API |
| `GCP_PROJECT_ID` | backend | Vertex project (ADC auth) |
| `VERTEX_REGION` | backend | Vertex region (default `us-east5`) |
| `VERTEX_MODEL` | backend | exact Model Garden Claude id |
| `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL` | backend | fallback path |
| `MONGO_URI` | backend / MCP | Atlas connection |
| `MCP_API_KEY` | MCP (Cloud Run) | `x-api-key` shared secret |
| `DEFAULT_USER_ID` | MCP | fallback user for tool calls |
| `AUTOMATION_ENABLED` | backend | master switch for browser automation |
| `AUTOMATION_HEADLESS` | backend | `false` = visible windows |
| `BROWSER_SLOWMO` | backend | ms delay per action (demo legibility) |
| `BROWSER_WS_ENDPOINT` | backend | drive a remote/cloud browser |

---

## Demo runbook (suggested)

1. Sign in to Curate → Dashboard.
2. Run an audit → agent (on Vertex) recommends a plan. Mention "the agent is
   running on Claude via Google Cloud Vertex AI."
3. Scroll to **"Watch Curate sign you up"** → pick **Tubi** → enter the account
   password → **Start**. A real Chrome window pops up (Mode A) while the dashboard
   filmstrip streams the same frames (Mode B). Tubi account is created for real.
4. Optionally run **Netflix** to show it driving the real signup to the payment
   screen and stopping safely before charging.
