import argparse
import json
import re
import sys
import time
from collections import Counter
from pathlib import Path

from simplejustwatchapi import details, popular, search


CURATED_TITLES = [
    "Breaking Bad",
    "Succession",
    "Game of Thrones",
    "Stranger Things",
    "The Last of Us",
    "The Bear",
    "Severance",
    "Ted Lasso",
    "The Mandalorian",
    "Andor",
    "The Office",
    "Parks and Recreation",
    "Oppenheimer",
    "Dune",
    "Interstellar",
    "Top Gun: Maverick",
    "Everything Everywhere All at Once",
    "The Dark Knight",
    "The Boys",
    "Yellowstone",
]

GENRE_CODES = {
    "act": "action",
    "ani": "animation",
    "cmy": "comedy",
    "crm": "crime",
    "doc": "documentary",
    "drm": "drama",
    "fnt": "fantasy",
    "hrr": "horror",
    "hst": "history",
    "msc": "music",
    "rly": "reality",
    "rma": "romance",
    "scf": "sci-fi",
    "spt": "sport",
    "trl": "thriller",
    "war": "war",
    "wsn": "western",
}

SERVICE_ALIASES = {
    "netflix": "netflix",
    "netflix basic with ads": "netflix",
    "hulu": "hulu",
    "disney plus": "disney",
    "disney+": "disney",
    "disney": "disney",
    "max": "max",
    "hbo max": "max",
    "peacock": "peacock",
    "peacock premium": "peacock",
    "amazon prime video": "prime",
    "prime video": "prime",
    "amazon video": "prime",
    "apple tv plus": "appletv",
    "apple tv+": "appletv",
    "apple tv": "appletv",
    "paramount plus": "paramount",
    "paramount+": "paramount",
}


def safe_get(obj, name, default=None):
    if obj is None:
        return default
    if isinstance(obj, dict):
        return obj.get(name, default)
    return getattr(obj, name, default)


def to_plain(obj):
    if obj is None or isinstance(obj, (str, int, float, bool)):
        return obj
    if isinstance(obj, list):
        return [to_plain(item) for item in obj]
    if isinstance(obj, tuple) and hasattr(obj, "_asdict"):
        return {key: to_plain(value) for key, value in obj._asdict().items()}
    if isinstance(obj, tuple):
        return [to_plain(item) for item in obj]
    if isinstance(obj, dict):
        return {key: to_plain(value) for key, value in obj.items()}
    if hasattr(obj, "__dict__"):
        return {key: to_plain(value) for key, value in vars(obj).items()}
    return str(obj)


def clean_provider_name(value):
    if not value:
        return ""
    text = re.sub(r"[^a-z0-9+ ]+", " ", str(value).lower())
    return re.sub(r"\s+", " ", text).strip()


def normalize_service(package):
    candidates = [
        safe_get(package, "name"),
        safe_get(package, "technical_name"),
        safe_get(package, "short_name"),
    ]

    for candidate in candidates:
        cleaned = clean_provider_name(candidate)
        if cleaned in SERVICE_ALIASES:
            return SERVICE_ALIASES[cleaned]

    joined = clean_provider_name(" ".join(str(c) for c in candidates if c))
    for alias, service in SERVICE_ALIASES.items():
        if alias in joined:
            return service

    return None


def normalize_type(object_type):
    normalized = str(object_type or "").lower()
    if normalized == "movie":
        return "movie"
    if normalized in {"show", "series"}:
        return "series"
    return None


def normalize_genres(genres):
    normalized = []
    for genre in genres or []:
        value = str(genre).lower()
        normalized.append(GENRE_CODES.get(value, value))
    return sorted(set(normalized))


def normalize_offer(offer):
    package = safe_get(offer, "package")
    service = normalize_service(package)
    if not service:
        return None

    return {
        "service": service,
        "displayName": safe_get(package, "name") or service,
        "monetizationType": str(safe_get(offer, "monetization_type", "") or "").lower(),
        "presentationType": str(safe_get(offer, "presentation_type", "") or "").lstrip("_").lower(),
        "url": safe_get(offer, "url"),
    }


def normalize_entry(entry):
    external_id = safe_get(entry, "entry_id") or safe_get(entry, "node_id") or safe_get(entry, "id")
    title = safe_get(entry, "title")
    show_type = normalize_type(safe_get(entry, "object_type"))

    if not external_id or not title or not show_type:
        return None

    offers = []
    seen_offers = set()
    for offer in safe_get(entry, "offers", []) or []:
        normalized = normalize_offer(offer)
        if not normalized:
            continue
        key = (
            normalized["service"],
            normalized["monetizationType"],
            normalized["presentationType"],
            normalized.get("url"),
        )
        if key in seen_offers:
            continue
        seen_offers.add(key)
        offers.append(normalized)

    services = sorted({offer["service"] for offer in offers})

    return {
        "externalId": str(external_id),
        "title": title,
        "type": show_type,
        "year": safe_get(entry, "release_year"),
        "genre": normalize_genres(safe_get(entry, "genres", [])),
        "services": services,
        "offers": offers,
        "rawJustWatch": {
            "objectType": safe_get(entry, "object_type"),
            "nodeId": str(external_id),
            "url": safe_get(entry, "url"),
            "imdbId": safe_get(entry, "imdb_id"),
            "tmdbId": safe_get(entry, "tmdb_id"),
            "raw": to_plain(entry),
        },
    }


def fetch_details(entry, country, language):
    external_id = safe_get(entry, "entry_id")
    if not external_id:
        return entry

    try:
        detailed = details(external_id, country=country, language=language)
        return detailed or entry
    except Exception as err:
        print(f"Warning: details failed for {external_id}: {err}", file=sys.stderr)
        return entry


def dedupe(records):
    by_external_id = {}
    title_year_seen = set()

    for record in records:
        if not record:
            continue

        external_id = record["externalId"]
        title_year = (record["title"].strip().lower(), record.get("year"))

        if external_id in by_external_id:
            existing = by_external_id[external_id]
            if len(record.get("services", [])) > len(existing.get("services", [])):
                by_external_id[external_id] = record
            continue

        if title_year in title_year_seen:
            continue

        by_external_id[external_id] = record
        title_year_seen.add(title_year)

    return list(by_external_id.values())


def load_curated_titles():
    seed_path = Path(__file__).resolve().parents[2] / "data" / "shows.json"
    if not seed_path.exists():
        return CURATED_TITLES

    try:
        seed_data = json.loads(seed_path.read_text(encoding="utf-8"))
        titles = [item.get("title") for item in seed_data if item.get("title")]
        return list(dict.fromkeys(titles + CURATED_TITLES))
    except Exception as err:
        print(f"Warning: could not read curated seed titles: {err}", file=sys.stderr)
        return CURATED_TITLES


def parse_args():
    parser = argparse.ArgumentParser(description="Fetch and normalize JustWatch data for Curate.")
    parser.add_argument("--country", default="US")
    parser.add_argument("--language", default="en")
    parser.add_argument("--count", type=int, default=80)
    parser.add_argument("--out", default="../../data/justwatch_shows.json")
    parser.add_argument("--delay", type=float, default=0.25)
    parser.add_argument("--include-curated", action="store_true")
    return parser.parse_args()


def main():
    args = parse_args()
    fetched = []

    try:
        popular_items = popular(country=args.country, language=args.language, count=args.count)
        fetched.extend(popular_items or [])
    except Exception as err:
        print(f"Warning: popular fetch failed: {err}", file=sys.stderr)

    if args.include_curated and len(fetched) < args.count:
        for title in load_curated_titles():
            if len(fetched) >= args.count:
                break
            try:
                results = search(title, country=args.country, language=args.language, count=1)
                fetched.extend(results or [])
            except Exception as err:
                print(f"Warning: search failed for {title}: {err}", file=sys.stderr)
            time.sleep(args.delay)

    normalized = []
    for entry in fetched:
        try:
            detailed_entry = fetch_details(entry, args.country, args.language)
            record = normalize_entry(detailed_entry)
            if record:
                normalized.append(record)
        except Exception as err:
            title = safe_get(entry, "title", "unknown title")
            print(f"Warning: normalization failed for {title}: {err}", file=sys.stderr)
        time.sleep(args.delay)

    records = dedupe(normalized)[: args.count]
    out_path = Path(args.out)
    if not out_path.is_absolute():
        out_path = Path.cwd() / out_path
    out_path = out_path.resolve()
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(records, indent=2, ensure_ascii=False), encoding="utf-8")

    services = Counter(service for record in records for service in record.get("services", []))
    print(f"total fetched: {len(fetched)}")
    print(f"total normalized: {len(records)}")
    print(f"total with supported services: {sum(1 for record in records if record.get('services'))}")
    print(f"services distribution: {dict(sorted(services.items()))}")
    print(f"output: {out_path}")


if __name__ == "__main__":
    main()
