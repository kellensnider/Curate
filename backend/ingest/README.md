# JustWatch Ingestion

Curate uses the unofficial `simple-justwatch-python-api` package to fetch show
and movie availability from JustWatch into a local JSON file. The Node backend
then imports that JSON into MongoDB with Mongoose.

This API is unofficial and may change or break without warning. The ingestion
script is intentionally small and defensive so the rest of the backend can stay
Node/Express.

## Setup

```bash
cd backend/ingest
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

On Windows PowerShell:

```powershell
cd backend/ingest
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## Run Ingestion

```bash
python justwatch_ingest.py --country US --language en --count 80 --include-curated
```

This writes normalized output to:

```text
data/justwatch_shows.json
```

## Import Into MongoDB

```bash
cd ..
npm run import:justwatch
```

## Refresh In One Command

From `backend/`:

```bash
npm run refresh:justwatch
```

## Current Limits

Curate only maps these 8 streaming providers for now:

- Netflix
- Hulu
- Disney+
- Max
- Peacock
- Prime Video
- Apple TV+
- Paramount+

Unsupported providers are ignored for Curate availability, but raw JustWatch
metadata is kept in each record's `rawJustWatch` field when available.
