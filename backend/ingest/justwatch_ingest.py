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
    "Avatar",
    "The Matrix",
    "Pulp Fiction",
    "Forrest Gump",
    "The Sopranos",
    "The Wire",
    "Fargo",
    "The Handmaid's Tale",
    "Loki",
    "Black Panther",
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
    "paramount plus": "paramount",
    "paramount+": "paramount",
}

SUPPORTED_SERVICES = sorted(set(SERVICE_ALIASES.values()))
IMAGE_HOST = "https://images.justwatch.com"


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


def normalize_image_url(value, width="s718"):
    if not value or not isinstance(value, str):
        return None

    url = value.strip()
    if not url:
        return None
    if url.startswith("http://") or url.startswith("https://"):
        return url
    if url.startswith("//"):
        return f"https:{url}"
    if url.startswith("/"):
        if re.search(r"/s\d+/", url):
            return f"{IMAGE_HOST}{url}"
        return f"{IMAGE_HOST}{url}/{width}"
    return None


def first_image(values, width):
    if isinstance(values, str):
        return normalize_image_url(values, width)
    if isinstance(values, list):
        for value in values:
            normalized = normalize_image_url(value, width)
            if normalized:
                return normalized
    return None


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
    poster_url = first_image(safe_get(entry, "poster"), "s718")
    backdrop_url = first_image(safe_get(entry, "backdrops"), "s1920")

    if not external_id or not title or not show_type:
        return None, "missing_required"
    if not poster_url:
        return None, "missing_poster"

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
        "source": "justwatch",
        "title": title,
        "type": show_type,
        "year": safe_get(entry, "release_year"),
        "genre": normalize_genres(safe_get(entry, "genres", [])),
        "services": services,
        "posterUrl": poster_url,
        "backdropUrl": backdrop_url,
        "overview": safe_get(entry, "short_description"),
        "offers": offers,
        "rawJustWatch": {
            "objectType": safe_get(entry, "object_type"),
            "nodeId": str(external_id),
            "url": safe_get(entry, "url"),
            "imdbId": safe_get(entry, "imdb_id"),
            "tmdbId": safe_get(entry, "tmdb_id"),
            "raw": to_plain(entry),
        },
    }, None


def call_with_retries(fn, *args, retries=3, delay=0.25, label="request", **kwargs):
    last_error = None
    for attempt in range(1, retries + 1):
        try:
            return fn(*args, **kwargs)
        except Exception as err:
            last_error = err
            if attempt < retries:
                sleep_for = delay * attempt
                print(f"Warning: {label} failed ({err}); retrying in {sleep_for:.2f}s", file=sys.stderr)
                time.sleep(sleep_for)
            else:
                print(f"Warning: {label} failed after {retries} attempts: {err}", file=sys.stderr)
    return None


def fetch_details(entry, country, language, delay):
    external_id = safe_get(entry, "entry_id")
    if not external_id:
        return entry

    detailed = call_with_retries(
        details,
        external_id,
        country=country,
        language=language,
        retries=3,
        delay=delay,
        label=f"details {external_id}",
    )
    return detailed or entry


def dedupe(records):
    by_external_id = {}
    title_year_seen = set()

    for record in records:
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


def fetch_popular_candidates(args):
    fetched = []
    seen_ids = set()
    page_size = min(100, max(20, args.count))
    max_offsets = args.max_attempts

    # Fetch movies and series separately so the final catalog is not one-sided.
    for object_type in ("MOVIE", "SHOW"):
        offset = 0
        attempts = 0
        target_per_type = max(args.count // 2, 1)
        while attempts < max_offsets and sum(1 for item in fetched if normalize_type(safe_get(item, "object_type")) == normalize_type(object_type)) < target_per_type:
            label = f"popular {object_type} offset {offset}"
            items = call_with_retries(
                popular,
                country=args.country,
                language=args.language,
                count=page_size,
                offset=offset,
                object_types=object_type,
                retries=3,
                delay=args.delay,
                label=label,
            ) or []

            if not items:
                break

            added = 0
            for item in items:
                external_id = safe_get(item, "entry_id")
                if external_id and external_id not in seen_ids:
                    seen_ids.add(external_id)
                    fetched.append(item)
                    added += 1

            print(f"Fetched {len(items)} {object_type} candidates at offset {offset} ({len(seen_ids)} unique)")
            if added == 0:
                break
            offset += page_size
            attempts += 1
            time.sleep(args.delay)

    return fetched


def add_curated_candidates(args, fetched):
    seen_ids = {safe_get(item, "entry_id") for item in fetched if safe_get(item, "entry_id")}

    for title in load_curated_titles():
        try:
            results = call_with_retries(
                search,
                title,
                country=args.country,
                language=args.language,
                count=3,
                retries=3,
                delay=args.delay,
                label=f"search {title}",
            ) or []
            for item in results:
                external_id = safe_get(item, "entry_id")
                if external_id and external_id not in seen_ids:
                    seen_ids.add(external_id)
                    fetched.append(item)
        except Exception as err:
            print(f"Warning: search failed for {title}: {err}", file=sys.stderr)
        time.sleep(args.delay)

    return fetched


def interleave_by_type(items):
    movies = [item for item in items if normalize_type(safe_get(item, "object_type")) == "movie"]
    series = [item for item in items if normalize_type(safe_get(item, "object_type")) == "series"]
    others = [item for item in items if normalize_type(safe_get(item, "object_type")) not in {"movie", "series"}]
    interleaved = []
    max_len = max(len(movies), len(series))

    for index in range(max_len):
        if index < len(movies):
            interleaved.append(movies[index])
        if index < len(series):
            interleaved.append(series[index])

    return interleaved + others


def parse_args():
    parser = argparse.ArgumentParser(description="Fetch and normalize JustWatch data for Curate.")
    parser.add_argument("--country", default="US")
    parser.add_argument("--language", default="en")
    parser.add_argument("--count", type=int, default=80)
    parser.add_argument("--out", default="../../data/justwatch_shows.json")
    parser.add_argument("--delay", type=float, default=0.25)
    parser.add_argument("--include-curated", action="store_true")
    parser.add_argument("--max-attempts", type=int, default=8)
    return parser.parse_args()


def main():
    args = parse_args()
    fetched = fetch_popular_candidates(args)

    if args.include_curated:
        fetched = add_curated_candidates(args, fetched)

    fetched = interleave_by_type(fetched)
    normalized = []
    skip_reasons = Counter()
    processed = 0
    candidate_index = 0

    while candidate_index < len(fetched) and len(dedupe(normalized)) < args.count:
        entry = fetched[candidate_index]
        candidate_index += 1
        processed += 1

        try:
            detailed_entry = fetch_details(entry, args.country, args.language, args.delay)
            record, reason = normalize_entry(detailed_entry)
            if record:
                normalized.append(record)
            else:
                skip_reasons[reason or "unknown"] += 1
        except Exception as err:
            title = safe_get(entry, "title", "unknown title")
            skip_reasons["normalization_error"] += 1
            print(f"Warning: normalization failed for {title}: {err}", file=sys.stderr)

        if processed % 25 == 0:
            usable = len(dedupe(normalized))
            print(f"Normalized progress: {usable}/{args.count} usable records")
        time.sleep(args.delay)

    records = dedupe(normalized)[: args.count]
    out_path = Path(args.out)
    if not out_path.is_absolute():
        out_path = Path.cwd() / out_path
    out_path = out_path.resolve()
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(records, indent=2, ensure_ascii=False), encoding="utf-8")

    services = Counter(service for record in records for service in record.get("services", []))
    type_counts = Counter(record.get("type") for record in records)
    with_services = sum(1 for record in records if record.get("services"))
    with_posters = sum(1 for record in records if record.get("posterUrl"))

    print(f"total fetched candidates: {len(fetched)}")
    print(f"total processed candidates: {processed}")
    print(f"total normalized usable: {len(records)}")
    print(f"total with posterUrl: {with_posters}")
    print(f"total with supported services: {with_services}")
    print(f"type distribution: {dict(sorted(type_counts.items()))}")
    print(f"services distribution: {dict(sorted(services.items()))}")
    print(f"skipped missing poster: {skip_reasons.get('missing_poster', 0)}")
    print(f"skipped reasons: {dict(sorted(skip_reasons.items()))}")
    print(f"target reached: {'yes' if len(records) >= args.count else 'no'} ({len(records)}/{args.count})")
    print(f"output: {out_path}")

    if len(records) < args.count:
        sys.exit(2)


if __name__ == "__main__":
    main()
