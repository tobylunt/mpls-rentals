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
CACHE = ROOT / "scripts" / ".geocode_cache.json"

USER_AGENT = "mpls-rentals-map/0.1 (personal project)"

# -- Hardcoded addresses for named buildings (Lodging cells that aren't street addresses).
# Verify each by searching the building name; update here if any are wrong.
NAMED_BUILDINGS: dict[str, str] = {
    "The Collection C5": "2071 Ford Pkwy, Saint Paul, MN",
    "Linden 43 Unit 410": "Linden 43, 4310 Upton Ave S, Minneapolis, MN",
    "Noko apartments": "Noko Apartments Minneapolis",
    "Sanctuary Lofts": "2400 Park Ave S, Minneapolis, MN",
}

# Normalize school names to geocoder-friendly queries.
SCHOOL_QUERIES: dict[str, str] = {
    "Burroughs": "Burroughs Community School, Minneapolis, MN",
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
    wb = openpyxl.load_workbook(XLSX, data_only=True)
    ws = wb.active

    rows = list(ws.iter_rows(min_row=2, values_only=True))
    listings: list[dict[str, Any]] = []

    for r in rows:
        if r[0] is None:
            continue
        lodging = str(r[0]).strip()
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

        listings.append({
            "id": slugify(lodging) or slugify(address),
            "lodging": lodging,
            "address": address,
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
