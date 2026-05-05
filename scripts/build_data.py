"""Build public/data/listings.json from the source Excel file.

Run from repo root:
    python3 scripts/build_data.py

Re-runs are cheap thanks to scripts/.geocode_cache.json.
"""

import datetime as dt
import json
import math
import re
import sys
import time
from pathlib import Path
from typing import Any

import openpyxl
import requests

ROOT = Path(__file__).resolve().parent.parent
XLSX = ROOT / "2026 MPLS housing.xlsx"
OUT = ROOT / "public" / "data" / "listings.json"
IMAGES_DIR = ROOT / "public" / "images"
CACHE = ROOT / "scripts" / ".geocode_cache.json"
OG_CACHE = ROOT / "scripts" / ".og_image_cache.json"

USER_AGENT = "mpls-rentals-map/0.1 (personal project)"
# UAs to try in order. facebookexternalhit is often whitelisted because sites
# want their share previews to render on Facebook. Many real-estate sites that
# return 403 to Chrome will return 200 to it.
SCRAPE_UAS = [
    "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
    "Twitterbot/1.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
]

# Listings to skip (no longer available, etc.). Match by Lodging cell value.
SKIP_LISTINGS: set[str] = {
    "5027 Chowen Ave S",
}

# Manual image overrides — paste a URL or local path here for any listing
# whose image we couldn't scrape. Example:
#   "4807 Grand Ave S #1": "https://example.com/zillow-photo.jpg"
# Local paths (relative to repo root) are accepted, e.g. "scripts/seed/4807.jpg".
MANUAL_IMAGES: dict[str, str] = {
    "Noko apartments": (
        "https://static.wixstatic.com/media/"
        "f3dec5_550c4994b91e4381bbcdcfaf2609ae94~mv2.jpg/v1/fit/w_960,h_640,q_90/"
        "f3dec5_550c4994b91e4381bbcdcfaf2609ae94~mv2.jpg"
    ),
    "Sanctuary Lofts": (
        "https://images.squarespace-cdn.com/content/v1/"
        "642f00977c432651bb8947ba/f5e53a37-2aee-4c62-a216-e17ce964edbc/Hero_web.jpg"
    ),
}

# -- Hardcoded addresses for named buildings (Lodging cells that aren't street addresses).
# Verify each by searching the building name; update here if any are wrong.
NAMED_BUILDINGS: dict[str, str] = {
    "The Collection C5": "800 Cretin Ave S, Saint Paul, MN 55116",
    "Linden 43 Unit 410": "Linden 43, 4310 Upton Ave S, Minneapolis, MN",
    "Noko apartments": "4720 Longfellow Ave S, Minneapolis, MN",
    "Sanctuary Lofts": "3225 E Minnehaha Pkwy, Minneapolis, MN 55417",
}

# Normalize school names to geocoder-friendly queries.
SCHOOL_QUERIES: dict[str, str] = {
    "Burroughs": "1601 W 50th St, Minneapolis, MN 55419",
    "Lake Harriet": "Lake Harriet Community School Lower Campus, Minneapolis, MN",
    "Horace Mann": "Horace Mann Elementary School, Saint Paul, MN",
    "Groveland Park": "Groveland Park Elementary School, Saint Paul, MN",
    "Northrop": "Northrop Urban Environmental School, Minneapolis, MN",
    "Wenonah": "Wenonah Elementary, Minneapolis MN",
}

# Normalize daycare names.
DAYCARE_QUERIES: dict[str, str] = {
    "Casa Kingfield": "Casa de Corazon Kingfield, Minneapolis, MN",
    "Casa Highland Park": "Casa de Corazon Highland Park, Saint Paul, MN",
    "Casa 50th and France": "Casa de Corazon 50th and France, Edina, MN",
}

WORK_QUERY = "710 S 2nd St, Minneapolis, MN 55401"


def load_cache() -> dict[str, list[float] | None]:
    if CACHE.exists():
        return json.loads(CACHE.read_text())
    return {}


def save_cache(cache: dict[str, list[float] | None]) -> None:
    CACHE.write_text(json.dumps(cache, indent=2, sort_keys=True))


def load_og_cache() -> dict[str, str | None]:
    if OG_CACHE.exists():
        return json.loads(OG_CACHE.read_text())
    return {}


def save_og_cache(cache: dict[str, str | None]) -> None:
    OG_CACHE.write_text(json.dumps(cache, indent=2, sort_keys=True))


# Match og:image (or twitter:image as fallback) regardless of attribute order/quoting style.
_OG_RE = re.compile(
    r'<meta[^>]*?(?:property|name)=["\'](?:og:image|twitter:image)["\'][^>]*?content=["\']([^"\']+)["\']',
    re.IGNORECASE,
)
_OG_RE_REV = re.compile(
    r'<meta[^>]*?content=["\']([^"\']+)["\'][^>]*?(?:property|name)=["\'](?:og:image|twitter:image)["\']',
    re.IGNORECASE,
)


def _try_fetch(url: str, ua: str) -> str | None:
    """Single GET attempt. Returns response text on 200, None otherwise."""
    try:
        r = requests.get(
            url,
            headers={
                "User-Agent": ua,
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9",
            },
            timeout=15,
            allow_redirects=True,
        )
        if r.status_code == 200:
            return r.text
        print(f"    {ua.split('/')[0]}: HTTP {r.status_code}")
        return None
    except Exception as e:
        print(f"    {ua.split('/')[0]}: {e}", file=sys.stderr)
        return None


def fetch_og_image(url: str, cache: dict[str, str | None]) -> str | None:
    """Best-effort og:image scrape. Tries facebookexternalhit, Twitterbot, then Chrome.
    Caches results (success or failure) to avoid retries."""
    if url in cache:
        return cache[url]
    print(f"  scraping: {url}")
    text: str | None = None
    for ua in SCRAPE_UAS:
        text = _try_fetch(url, ua)
        if text:
            break
        time.sleep(0.4)
    if not text:
        cache[url] = None
        save_og_cache(cache)
        return None
    m = _OG_RE.search(text) or _OG_RE_REV.search(text)
    if m:
        img = m.group(1)
        print(f"    -> {img[:80]}")
        cache[url] = img
    else:
        print("    no og:image found")
        cache[url] = None
    save_og_cache(cache)
    time.sleep(0.4)
    return cache[url]


def _ext_for(content_type: str | None, url: str) -> str:
    if content_type:
        ct = content_type.lower()
        if "jpeg" in ct or "jpg" in ct:
            return ".jpg"
        if "png" in ct:
            return ".png"
        if "webp" in ct:
            return ".webp"
        if "gif" in ct:
            return ".gif"
    # Fall back to URL suffix
    for ext in (".jpg", ".jpeg", ".png", ".webp", ".gif"):
        if ext in url.lower():
            return ".jpg" if ext == ".jpeg" else ext
    return ".jpg"


def download_image(image_url: str, listing_id: str) -> str | None:
    """Download an image (URL or local path) to public/images/<id>.<ext>.
    Returns the public URL path (e.g. "/images/foo.jpg") or None on failure."""
    IMAGES_DIR.mkdir(parents=True, exist_ok=True)

    # Local-path override: copy the file into public/images.
    if not image_url.startswith(("http://", "https://")):
        src = ROOT / image_url
        if not src.is_file():
            print(f"    local override missing: {src}")
            return None
        ext = src.suffix or ".jpg"
        dst = IMAGES_DIR / f"{listing_id}{ext}"
        dst.write_bytes(src.read_bytes())
        return f"/images/{dst.name}"

    # Reuse existing download (idempotent across reruns).
    existing = list(IMAGES_DIR.glob(f"{listing_id}.*"))
    if existing:
        return f"/images/{existing[0].name}"

    print(f"    downloading: {image_url[:80]}")
    for ua in SCRAPE_UAS:
        try:
            r = requests.get(
                image_url,
                headers={"User-Agent": ua, "Referer": image_url},
                timeout=20,
                allow_redirects=True,
            )
            if r.status_code != 200:
                continue
            ext = _ext_for(r.headers.get("content-type"), image_url)
            dst = IMAGES_DIR / f"{listing_id}{ext}"
            dst.write_bytes(r.content)
            print(f"    saved: {dst.name} ({len(r.content)//1024} KB)")
            return f"/images/{dst.name}"
        except Exception as e:
            print(f"    {ua.split('/')[0]}: {e}", file=sys.stderr)
    print("    download failed")
    return None


def geocode(query: str, cache: dict[str, list[float] | None]) -> tuple[float, float] | None:
    if query in cache:
        v = cache[query]
        return tuple(v) if v else None  # type: ignore[return-value]
    print(f"  geocoding: {query}")
    try:
        r = requests.get(
            "https://nominatim.openstreetmap.org/search",
            params={"q": query, "format": "json", "limit": 1, "countrycodes": "us"},
            headers={"User-Agent": USER_AGENT},
            timeout=15,
        )
        r.raise_for_status()
        results = r.json()
    except Exception as e:
        print(f"    ERROR: {e}", file=sys.stderr)
        cache[query] = None
        save_cache(cache)
        time.sleep(1.1)
        return None
    if not results:
        print("    no results")
        cache[query] = None
    else:
        lat, lng = float(results[0]["lat"]), float(results[0]["lon"])
        cache[query] = [lat, lng]
        print(f"    -> {lat:.5f}, {lng:.5f}")
    save_cache(cache)
    time.sleep(1.1)  # Nominatim rate limit: 1 req/sec
    return tuple(cache[query]) if cache[query] else None  # type: ignore[return-value]


def slugify(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def parse_bedrooms(cell: Any) -> tuple[int | None, str | None]:
    if not isinstance(cell, str):
        return None, None
    m = re.match(r"(\d+)\s*BR\s+(\w+)", cell, re.IGNORECASE)
    if not m:
        return None, None
    return int(m.group(1)), m.group(2).lower()


# Distance cell formats observed:
#   "22 min walk (4)"   -> walk=22, drive=4
#   "8 min walk"        -> walk=8, drive=None
#   "13 (4)"            -> walk=13, drive=4   (per user: first num = walk, paren = drive)
#   "13"                -> walk=13, drive=None
#   "12 min drive"      -> walk=None, drive=12  (rare; treat as drive-only)
#   "No route"          -> walk=None, drive=None
#   None / "?"          -> walk=None, drive=None
DIST_RE = re.compile(
    r"^\s*(?P<a>\d+)\s*(?P<unit>min\s+walk|min\s+drive)?\s*(?:\((?P<b>\d+)\))?\s*$",
    re.IGNORECASE,
)


def parse_distance(cell: Any) -> dict[str, Any]:
    raw = "" if cell is None else str(cell).strip()
    if raw in {"", "?", "No route"}:
        return {"walk_min": None, "drive_min": None, "raw": raw}
    if isinstance(cell, (int, float)) and not isinstance(cell, bool):
        # Bare number with no parens -> walk minutes per spec
        return {"walk_min": int(cell), "drive_min": None, "raw": raw}
    m = DIST_RE.match(raw)
    if not m:
        return {"walk_min": None, "drive_min": None, "raw": raw}
    a = int(m.group("a"))
    b = int(m.group("b")) if m.group("b") else None
    unit = (m.group("unit") or "").lower()
    if "drive" in unit:
        return {"walk_min": None, "drive_min": a, "raw": raw}
    # Default: first number is walk, paren is drive
    return {"walk_min": a, "drive_min": b, "raw": raw}


def parse_work_distance(cell: Any) -> int | None:
    """Distance to work column: bare integer = drive minutes; 'No route' = None."""
    if cell is None:
        return None
    if isinstance(cell, (int, float)) and not isinstance(cell, bool):
        return int(cell)
    if isinstance(cell, str) and cell.strip().lower() in {"no route", "?", ""}:
        return None
    try:
        return int(str(cell).strip())
    except ValueError:
        return None


def parse_pet_rent(cell: Any) -> Any:
    if cell is None:
        return None
    if isinstance(cell, str) and cell.strip() == "?":
        return "unknown"
    if isinstance(cell, (int, float)):
        return float(cell)
    return "unknown"


def parse_yes_no(cell: Any) -> bool | None:
    if not isinstance(cell, str):
        return None
    s = cell.strip().lower()
    if s == "yes":
        return True
    if s == "no":
        return False
    return None


def parse_date(cell: Any) -> str:
    if isinstance(cell, dt.datetime):
        return cell.date().isoformat()
    if isinstance(cell, dt.date):
        return cell.isoformat()
    return "" if cell is None else str(cell)


def resolve_address(lodging: str, neighborhood: str | None) -> str:
    if lodging in NAMED_BUILDINGS:
        return NAMED_BUILDINGS[lodging]
    # Looks like a street address (starts with digits)?
    if re.match(r"^\d+\s", lodging):
        # Heuristic: certain neighborhoods are in St Paul.
        st_paul_hoods = {"macalaster/groveland", "highland park"}
        city = "Saint Paul, MN" if (neighborhood or "").lower() in st_paul_hoods else "Minneapolis, MN"
        # Strip unit suffix like "#1" or "Floor 2" before geocoding for better hit rate.
        cleaned = re.sub(r"\s*(#\S+|Floor\s+\d+|Unit\s+\S+)\s*$", "", lodging, flags=re.IGNORECASE)
        return f"{cleaned}, {city}"
    # Fallback: try as-is with Minneapolis suffix
    return f"{lodging}, Minneapolis, MN"


def haversine_km(a: tuple[float, float], b: tuple[float, float]) -> float:
    lat1, lon1 = math.radians(a[0]), math.radians(a[1])
    lat2, lon2 = math.radians(b[0]), math.radians(b[1])
    dlat, dlon = lat2 - lat1, lon2 - lon1
    h = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 2 * 6371 * math.asin(math.sqrt(h))


def main() -> None:
    cache = load_cache()
    og_cache = load_og_cache()
    # data_only=False keeps cell hyperlinks accessible (data_only=True drops them).
    wb = openpyxl.load_workbook(XLSX, data_only=False)
    ws = wb.active

    rows = list(ws.iter_rows(min_row=2))
    listings: list[dict[str, Any]] = []

    for row in rows:
        lodging_cell = row[0]
        if lodging_cell.value is None:
            continue
        lodging = str(lodging_cell.value).strip()
        if lodging in SKIP_LISTINGS:
            print(f"  skipping (per SKIP_LISTINGS): {lodging}")
            continue
        url = lodging_cell.hyperlink.target if lodging_cell.hyperlink else None
        # Pull plain values for the remaining cells.
        r = [c.value for c in row]
        neighborhood = r[2].strip() if isinstance(r[2], str) else None
        bedrooms, htype = parse_bedrooms(r[1])
        price = float(r[3]) if isinstance(r[3], (int, float)) else None
        pet_rent = parse_pet_rent(r[4])
        furnished = parse_yes_no(r[5])
        parking = r[6].strip() if isinstance(r[6], str) else None
        size_sqft = float(r[7]) if isinstance(r[7], (int, float)) else None
        price_per_sqft = (
            round(price / size_sqft, 2) if (price and size_sqft) else None
        )
        available = parse_date(r[9])
        term = r[10].strip() if isinstance(r[10], str) else None
        school = r[11].strip() if isinstance(r[11], str) else None
        daycare = r[12].strip() if isinstance(r[12], str) else None
        dist_school = parse_distance(r[13])
        dist_daycare = parse_distance(r[14])
        dist_work = parse_work_distance(r[15])
        utilities = r[16].strip() if isinstance(r[16], str) else None
        notes = r[17].strip() if isinstance(r[17], str) else None

        address = resolve_address(lodging, neighborhood)
        coords = geocode(address, cache)
        lat, lng = (coords[0], coords[1]) if coords else (None, None)

        listing_id = slugify(lodging) or slugify(address)

        # Image priority: manual override > scraped og:image > none.
        # Whatever we resolve gets downloaded locally; image_url in JSON is a
        # local /images/... path, never a remote URL.
        manual = MANUAL_IMAGES.get(lodging)
        scraped = fetch_og_image(url, og_cache) if url else None
        source = manual or scraped
        image_url = download_image(source, listing_id) if source else None

        listings.append({
            "id": listing_id,
            "lodging": lodging,
            "address": address,
            "url": url,
            "image_url": image_url,
            "lat": lat,
            "lng": lng,
            "bedrooms": bedrooms,
            "housing_type": htype,
            "neighborhood": neighborhood,
            "price": price,
            "pet_rent": pet_rent,
            "furnished": furnished,
            "parking": parking,
            "size_sqft": size_sqft,
            "price_per_sqft": price_per_sqft,
            "available": available,
            "term": term,
            "school": school,
            "daycare": daycare,
            "dist_school": dist_school,
            "dist_daycare": dist_daycare,
            "dist_work_drive_min": dist_work,
            "utilities": utilities,
            "notes": notes,
        })

    # Build unique school + daycare lists from referenced names
    schools = []
    for short_name, query in SCHOOL_QUERIES.items():
        if any(l["school"] == short_name for l in listings):
            coords = geocode(query, cache)
            schools.append({
                "name": short_name,
                "query": query,
                "lat": coords[0] if coords else None,
                "lng": coords[1] if coords else None,
            })

    daycares = []
    for short_name, query in DAYCARE_QUERIES.items():
        if any(l["daycare"] == short_name for l in listings):
            coords = geocode(query, cache)
            daycares.append({
                "name": short_name,
                "query": query,
                "lat": coords[0] if coords else None,
                "lng": coords[1] if coords else None,
            })

    work_coords = geocode(WORK_QUERY, cache)
    work = {
        "name": "McKnight Foundation",
        "query": WORK_QUERY,
        "lat": work_coords[0] if work_coords else None,
        "lng": work_coords[1] if work_coords else None,
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({
        "listings": listings,
        "schools": schools,
        "daycares": daycares,
        "work": work,
    }, indent=2))

    bad = [l["lodging"] for l in listings if l["lat"] is None]
    print(f"\nWrote {len(listings)} listings to {OUT}")
    if bad:
        print(f"WARNING: failed to geocode {len(bad)} listings: {bad}")
        print("Edit NAMED_BUILDINGS in scripts/build_data.py and re-run.")


if __name__ == "__main__":
    main()
