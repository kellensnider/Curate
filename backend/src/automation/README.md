# Subscription automation (testing harness)

Credential-driven browser automation that signs in to / out of real streaming
services on the user's behalf. **Tubi only** for now — Tubi is free
(ad-supported, no card), so this validates the whole automation pipeline with
**zero payment / PCI exposure.**

## Safety model (read before enabling)

- **Off by default.** The endpoint returns `403` unless `AUTOMATION_ENABLED=true`.
  The deployed (Render) API leaves it off — automation is a local/testing tool.
- **Own accounts only.** Use your own test accounts. Do not point this at other
  people's accounts.
- **No secrets stored.** Email/password are received per request, held in memory
  for that single run, and never written to disk, logged, or saved to Mongo.
- **No cards.** Tubi needs no payment. Do **not** extend this to paid services
  until a PCI-compliant payment path exists — never put raw card numbers (PAN)
  through this backend.
- Screenshots (for debugging) are written to `backend/screenshots/` and served
  at `/screenshots`. They can show the logged-in account — keep them local.

## Run it locally

```bash
cd backend
npm i playwright            # not a deploy dependency; install where the worker runs
npx playwright install chromium

# enable + (optionally) watch the browser
AUTOMATION_ENABLED=true AUTOMATION_HEADLESS=false npm start
```

## API

`POST /api/automation/tubi` (requires auth — send the Curate JWT)

```json
{ "action": "subscribe", "email": "you@example.com", "password": "..." }
```

- `action: "subscribe"`   → signs in (proves the agent can authenticate)
- `action: "unsubscribe"` → signs in, then signs out (non-destructive "cancel")

Response: `{ ok, action, message, steps, screenshot }` or `{ ok: false, error, ... }`.

## Reality check

Datacenter IPs (e.g. Render) often trigger CAPTCHAs / device-verification on
real sign-ins, and Chromium needs system deps that the Render free tier doesn't
ship. For the demo, run the worker **locally** with `AUTOMATION_HEADLESS=false`
so you can see (and debug) the flow. Post-login selectors (sign-out menu) are
best-effort and may need tuning against a live session.
