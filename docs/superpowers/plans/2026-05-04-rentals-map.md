# Minneapolis Rentals Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-page React app that puts ~17 Minneapolis rental listings on an interactive Leaflet map, with filters, a list-map sync, a shortlist, and a side-by-side compare view — optimized for a family weighing schools, daycare, and commute together.

**Architecture:** Static SPA. A one-shot Python script (`scripts/build_data.py`) parses the source Excel file and geocodes addresses + schools + daycares + work via Nominatim, writing `public/data/listings.json`. The React app reads that JSON at runtime. No backend, no API keys. `npm run build` produces a static `dist/` folder.

**Tech Stack:** React 18, TypeScript, Vite, react-leaflet, Leaflet, Vitest (for score functions only), Python 3 + openpyxl + requests (data prep, runs once).

**Spec:** `docs/superpowers/specs/2026-05-04-rentals-map-design.md`

---

## File structure

After this plan completes, the repo will look like:

```
mpls-rentals/
├── 2026 MPLS housing.xlsx           # source Excel (already exists)
├── docs/superpowers/                # spec + plan (already exist)
├── scripts/
│   └── build_data.py                # Excel → listings.json (run once)
├── public/data/
│   └── listings.json                # generated, committed
├── src/
│   ├── main.tsx                     # React entry
│   ├── App.tsx                      # top-level layout, view toggle, selected listing
│   ├── data.ts                      # types + JSON loader
│   ├── score.ts                     # chain-time + filter predicates (pure)
│   ├── score.test.ts                # vitest
│   ├── shortlist.ts                 # localStorage hook
│   ├── components/
│   │   ├── Map.tsx
│   │   ├── FilterBar.tsx
│   │   ├── ListingList.tsx
│   │   ├── ListingCard.tsx
│   │   ├── ListingPopup.tsx
│   │   └── CompareView.tsx
│   └── styles.css
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
└── .gitignore
```

Each file has one responsibility — score logic is separate from UI; localStorage is separate from filters; Map is separate from list. `App.tsx` owns top-level state (filters, selected listing, view mode); leaf components are mostly presentational.

---

## Task 1: Initialize git, scaffold Vite + React + TS, verify boots

**Files:**
- Create: `.gitignore`, `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/styles.css`

- [ ] **Step 1: Initialize git**

```bash
cd /Users/tobiaslunt/code/mpls-rentals
git init
```

- [ ] **Step 2: Write `.gitignore`**

```
node_modules
dist
.DS_Store
*.log
*.tsbuildinfo
scripts/.geocode_cache.json
```

(We DO commit `public/data/listings.json` so the app works without re-running the Python script. We don't commit the geocode cache because it's a local optimization.)

- [ ] **Step 3: Write `package.json`**

```json
{
  "name": "mpls-rentals",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "leaflet": "^1.9.4",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-leaflet": "^4.2.1"
  },
  "devDependencies": {
    "@types/leaflet": "^1.9.12",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "typescript": "^5.5.3",
    "vite": "^5.4.1",
    "vitest": "^2.1.1"
  }
}
```

- [ ] **Step 4: Write `tsconfig.json`**

Single tsconfig — both src/ and vite.config.ts are type-checked under it. We use `tsc --noEmit` (not `tsc -b`) at build time so we don't need a composite/references setup.

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "types": ["vitest/globals"]
  },
  "include": ["src", "vite.config.ts"]
}
```

- [ ] **Step 5: Write `vite.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "node",
  },
});
```

- [ ] **Step 6: Write `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>MPLS Rentals</title>
    <link
      rel="stylesheet"
      href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
      crossorigin=""
    />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 7: Write `src/main.tsx`**

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 8: Write `src/App.tsx` (placeholder)**

```tsx
export default function App() {
  return <h1 style={{ padding: 24 }}>MPLS Rentals — bootstrapping…</h1>;
}
```

- [ ] **Step 9: Write `src/styles.css`**

```css
* { box-sizing: border-box; }
html, body, #root { height: 100%; margin: 0; }
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: #1a1a1a;
}
```

- [ ] **Step 10: Install and verify**

```bash
npm install
npm run dev
```

Expected: Vite prints a local URL (typically `http://localhost:5173`). Open it in a browser. Should see the "bootstrapping…" headline. Stop the server (Ctrl+C).

- [ ] **Step 11: Commit**

```bash
git add .gitignore package.json package-lock.json tsconfig.json vite.config.ts index.html src/
git commit -m "scaffold vite + react + ts"
```

---

## Task 2: Data prep script — Excel parsing + address resolution + geocoding

**Files:**
- Create: `scripts/build_data.py`
- Create: `public/data/listings.json` (generated by the script)

This task produces a single Python file. It's allowed to be ugly — it runs once. We'll add steps to verify the output by inspection.

- [ ] **Step 1: Write `scripts/build_data.py`**

```python
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
    "The Collection C5": "The Collection at Highland Park, 2071 Ford Pkwy, St Paul, MN",
    "Linden 43 Unit 410": "Linden 43, 4310 Upton Ave S, Minneapolis, MN",
    "Noko apartments": "Noko Apartments, 4747 Hiawatha Ave, Minneapolis, MN",
    "Sanctuary Lofts": "Sanctuary Apartments, 2400 Park Ave, Minneapolis, MN",
}

# Normalize school names to geocoder-friendly queries.
SCHOOL_QUERIES: dict[str, str] = {
    "Burroughs": "Burroughs Community School, Minneapolis, MN",
    "Lake Harriet": "Lake Harriet Community School Lower Campus, Minneapolis, MN",
    "Horace Mann": "Horace Mann Elementary School, Saint Paul, MN",
    "Groveland Park": "Groveland Park Elementary School, Saint Paul, MN",
    "Northrop": "Northrop Urban Environmental School, Minneapolis, MN",
    "Wenonah": "Wenonah Elementary School, Minneapolis, MN",
}

# Normalize daycare names.
DAYCARE_QUERIES: dict[str, str] = {
    "Casa Kingfield": "Casa de Corazon Kingfield, Minneapolis, MN",
    "Casa Highland Park": "Casa de Corazon Highland Park, Saint Paul, MN",
    "Casa 50th and France": "Casa de Corazon 50th and France, Edina, MN",
}

WORK_QUERY = "McKnight Foundation, 710 South 2nd Street, Minneapolis, MN 55401"


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
```

- [ ] **Step 2: Run the script**

```bash
python3 scripts/build_data.py
```

Expected: prints geocoding lines (1/sec, takes ~30 seconds for ~25 unique queries), then writes `public/data/listings.json`. Each subsequent run is instant due to the cache.

If any listings fail to geocode, the script prints a WARNING line. Search for the building name on the web, update `NAMED_BUILDINGS` in the script, delete the bad entry from `scripts/.geocode_cache.json` (or just delete the cache), and re-run.

- [ ] **Step 3: Sanity-check the output**

```bash
python3 -c "import json; d=json.load(open('public/data/listings.json')); print(len(d['listings']), 'listings'); print('schools:', [s['name'] for s in d['schools']]); print('failed:', [l['lodging'] for l in d['listings'] if l['lat'] is None])"
```

Expected: `17 listings`, all 6 schools listed, no failed listings (or a small list you can fix).

Spot-check 2–3 listings: open the JSON, find a known address (e.g., "4807 Grand Ave S #1"), and verify `lat`/`lng` are roughly `44.92, -93.28` (Tangletown).

- [ ] **Step 4: Commit**

```bash
git add scripts/build_data.py public/data/listings.json
git commit -m "data: build_data.py + initial listings.json"
```

---

## Task 3: TypeScript types + JSON loader

**Files:**
- Create: `src/data.ts`

- [ ] **Step 1: Write `src/data.ts`**

```ts
import raw from "../public/data/listings.json";

export type Distance = {
  walk_min: number | null;
  drive_min: number | null;
  raw: string;
};

export type Listing = {
  id: string;
  lodging: string;
  address: string;
  lat: number | null;
  lng: number | null;
  bedrooms: number | null;
  housing_type: string | null;
  neighborhood: string | null;
  price: number | null;
  pet_rent: number | "unknown" | null;
  furnished: boolean | null;
  parking: string | null;
  size_sqft: number | null;
  price_per_sqft: number | null;
  available: string;
  term: string | null;
  school: string | null;
  daycare: string | null;
  dist_school: Distance;
  dist_daycare: Distance;
  dist_work_drive_min: number | null;
  utilities: string | null;
  notes: string | null;
};

export type Place = { name: string; query: string; lat: number | null; lng: number | null };

export type DataFile = {
  listings: Listing[];
  schools: Place[];
  daycares: Place[];
  work: Place;
};

export const data: DataFile = raw as DataFile;
```

Note: importing JSON via Vite's `resolveJsonModule` baked into our tsconfig works at build time. Vite will inline the JSON. (For runtime fetching with a loading state, we'd use `fetch("/data/listings.json")` — not needed here since the data is small and static.)

- [ ] **Step 2: Quick type-check**

```bash
npx tsc -b --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/data.ts
git commit -m "types: define Listing, Place, DataFile and load JSON"
```

---

## Task 4: Score functions + Vitest tests

**Files:**
- Create: `src/score.ts`
- Create: `src/score.test.ts`

This is the only place we use TDD. The functions are pure math, easily testable, and represent the headline livability metric — a regression here would silently mis-rank listings.

- [ ] **Step 1: Write the failing tests in `src/score.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { haversineKm, chainTimeMin, type ChainInputs } from "./score";

describe("haversineKm", () => {
  it("returns ~0 for identical points", () => {
    expect(haversineKm(44.9, -93.3, 44.9, -93.3)).toBeCloseTo(0, 5);
  });

  it("returns ~111 km for 1 degree of latitude", () => {
    expect(haversineKm(44.0, -93.0, 45.0, -93.0)).toBeCloseTo(111, 0);
  });
});

describe("chainTimeMin", () => {
  // Setup: home is 5 min drive from school. School and daycare are at the same
  // point (school === daycare coords) so middle term is ~0. Daycare to work is
  // a known 1-degree-lat distance => ~111 km => ~277 min at 2.5 min/km.
  const colocated: ChainInputs = {
    homeToSchoolDriveMin: 5,
    school: { lat: 44.9, lng: -93.3 },
    daycare: { lat: 44.9, lng: -93.3 },
    work: { lat: 45.9, lng: -93.3 },
  };

  it("computes the chain when school and daycare overlap", () => {
    // home->school: 5  +  school->daycare: ~0  +  daycare->work: ~277  =  ~282
    expect(chainTimeMin(colocated)).toBeCloseTo(5 + 0 + 111 * 2.5, 0);
  });

  it("penalizes school and daycare being far apart", () => {
    // Move daycare laterally (east), not along the school→work axis, so the
    // school→daycare leg adds chain time without canceling against daycare→work.
    const apart: ChainInputs = {
      ...colocated,
      daycare: { lat: 44.9, lng: -92.3 }, // ~80 km east of school
    };
    const close = chainTimeMin(colocated)!;
    const far = chainTimeMin(apart)!;
    expect(far).toBeGreaterThan(close);
  });

  it("returns null if school coords missing", () => {
    expect(chainTimeMin({ ...colocated, school: { lat: null, lng: null } })).toBeNull();
  });

  it("returns null if home->school drive is unknown and home coords missing too", () => {
    expect(
      chainTimeMin({
        homeToSchoolDriveMin: null,
        homeLat: null,
        homeLng: null,
        school: { lat: 44.9, lng: -93.3 },
        daycare: { lat: 44.9, lng: -93.3 },
        work: { lat: 45.0, lng: -93.3 },
      })
    ).toBeNull();
  });

  it("falls back to straight-line for home->school when drive minutes missing", () => {
    const result = chainTimeMin({
      homeToSchoolDriveMin: null,
      homeLat: 44.9,
      homeLng: -93.3,
      school: { lat: 44.9, lng: -93.3 }, // home == school
      daycare: { lat: 44.9, lng: -93.3 },
      work: { lat: 44.9, lng: -93.3 },
    });
    expect(result).toBeCloseTo(0, 0);
  });
});
```

- [ ] **Step 2: Run tests and verify they fail**

```bash
npm test
```

Expected: FAIL with "Cannot find module './score'" or "haversineKm is not a function".

- [ ] **Step 3: Write minimal implementation in `src/score.ts`**

```ts
const DRIVE_MIN_PER_KM = 2.5;

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const r = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(a));
}

type Pt = { lat: number | null; lng: number | null };

export type ChainInputs = {
  homeToSchoolDriveMin: number | null;
  homeLat?: number | null;
  homeLng?: number | null;
  school: Pt;
  daycare: Pt;
  work: Pt;
};

function isFull(p: Pt): p is { lat: number; lng: number } {
  return p.lat != null && p.lng != null;
}

function driveMinBetween(a: Pt, b: Pt): number | null {
  if (!isFull(a) || !isFull(b)) return null;
  return haversineKm(a.lat, a.lng, b.lat, b.lng) * DRIVE_MIN_PER_KM;
}

export function chainTimeMin(input: ChainInputs): number | null {
  if (!isFull(input.school) || !isFull(input.daycare) || !isFull(input.work)) {
    return null;
  }

  let homeToSchool = input.homeToSchoolDriveMin;
  if (homeToSchool == null) {
    const home: Pt = { lat: input.homeLat ?? null, lng: input.homeLng ?? null };
    homeToSchool = driveMinBetween(home, input.school);
    if (homeToSchool == null) return null;
  }

  const schoolToDaycare = driveMinBetween(input.school, input.daycare)!;
  const daycareToWork = driveMinBetween(input.daycare, input.work)!;

  return homeToSchool + schoolToDaycare + daycareToWork;
}
```

- [ ] **Step 4: Run tests and verify they pass**

```bash
npm test
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/score.ts src/score.test.ts
git commit -m "score: chain-time + haversine with tests"
```

---

## Task 5: Basic map renders all listing pins

**Files:**
- Create: `src/components/Map.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

Default Leaflet pins for now. Styling and aux markers come in later tasks.

- [ ] **Step 1: Write `src/components/Map.tsx`**

```tsx
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { type Listing } from "../data";

// Fix default-marker icon paths (Leaflet's defaults assume a webpack setup that
// doesn't apply here). Pull from CDN.
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = defaultIcon;

const MPLS_CENTER: [number, number] = [44.93, -93.27];

export function Map({ listings }: { listings: Listing[] }) {
  return (
    <MapContainer
      center={MPLS_CENTER}
      zoom={12}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {listings.map((l) =>
        l.lat != null && l.lng != null ? (
          <Marker key={l.id} position={[l.lat, l.lng]}>
            <Popup>
              <strong>{l.lodging}</strong>
              <br />
              ${l.price?.toLocaleString()} · {l.bedrooms}BR
            </Popup>
          </Marker>
        ) : null
      )}
    </MapContainer>
  );
}
```

- [ ] **Step 2: Replace `src/App.tsx`**

```tsx
import { Map } from "./components/Map";
import { data } from "./data";

export default function App() {
  return (
    <div className="app">
      <header className="topbar">
        <h1>MPLS Rentals</h1>
      </header>
      <main className="main">
        <Map listings={data.listings} />
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Add layout styles to `src/styles.css`**

Append to the existing file:

```css
.app { display: flex; flex-direction: column; height: 100vh; }
.topbar {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  border-bottom: 1px solid #e5e5e5;
  background: #fff;
}
.topbar h1 { font-size: 18px; margin: 0; }
.main { flex: 1; min-height: 0; }
```

- [ ] **Step 4: Verify in browser**

```bash
npm run dev
```

Open the local URL. Expected: map fills the screen below the topbar, ~17 default-blue pins clustered in south Minneapolis / Highland Park. Click a pin: popup shows address, price, bedrooms.

- [ ] **Step 5: Commit**

```bash
git add src/components/Map.tsx src/App.tsx src/styles.css
git commit -m "map: render listing pins on Leaflet+OSM"
```

---

## Task 6: Pin styling — price quartile colors + star overlay for shortlist

**Files:**
- Modify: `src/components/Map.tsx`
- Create: `src/shortlist.ts`

The shortlist hook is wired here so pins can show the star, even though the UI to toggle stars comes later. We'll seed the localStorage manually for now to verify the visual.

- [ ] **Step 1: Write `src/shortlist.ts`**

```ts
import { useEffect, useState } from "react";

const KEY = "mpls-rentals.shortlist";

function read(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export function useShortlist() {
  const [ids, setIds] = useState<Set<string>>(() => read());

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify([...ids]));
    } catch {
      /* localStorage unavailable -> ignore */
    }
  }, [ids]);

  function toggle(id: string) {
    setIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return { ids, toggle };
}
```

- [ ] **Step 2: Compute price quartiles and use a colored DivIcon**

Replace `src/components/Map.tsx` with:

```tsx
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { useMemo } from "react";
import { type Listing } from "../data";

const MPLS_CENTER: [number, number] = [44.93, -93.27];

// 4 colors green → red for cheapest → priciest quartile
const QUARTILE_COLORS = ["#2e7d32", "#9ccc65", "#ffb300", "#e53935"];

function quartileFor(price: number, breaks: number[]): number {
  for (let i = 0; i < breaks.length; i++) if (price <= breaks[i]) return i;
  return breaks.length;
}

function computeBreaks(prices: number[]): number[] {
  const sorted = [...prices].sort((a, b) => a - b);
  const q = (p: number) => sorted[Math.floor(sorted.length * p)];
  return [q(0.25), q(0.5), q(0.75)];
}

function pinIcon(color: string, starred: boolean): L.DivIcon {
  return L.divIcon({
    className: "rental-pin",
    html: `
      <div class="rental-pin__body" style="background:${color}">
        ${starred ? '<span class="rental-pin__star">★</span>' : ""}
      </div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

export function Map({
  listings,
  shortlist,
}: {
  listings: Listing[];
  shortlist: Set<string>;
}) {
  const breaks = useMemo(
    () => computeBreaks(listings.map((l) => l.price ?? 0).filter((p) => p > 0)),
    [listings]
  );

  return (
    <MapContainer
      center={MPLS_CENTER}
      zoom={12}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {listings.map((l) => {
        if (l.lat == null || l.lng == null) return null;
        const q = l.price ? quartileFor(l.price, breaks) : 1;
        const icon = pinIcon(QUARTILE_COLORS[q], shortlist.has(l.id));
        return (
          <Marker key={l.id} position={[l.lat, l.lng]} icon={icon}>
            <Popup>
              <strong>{l.lodging}</strong>
              <br />
              ${l.price?.toLocaleString()} · {l.bedrooms}BR
              {l.school ? ` · ${l.school}` : ""}
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
```

- [ ] **Step 3: Add pin CSS to `src/styles.css`**

Append:

```css
.rental-pin__body {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid #fff;
  box-shadow: 0 1px 3px rgba(0,0,0,0.3);
  display: flex;
  align-items: center;
  justify-content: center;
}
.rental-pin__star {
  color: #fff;
  font-size: 14px;
  line-height: 1;
}
```

- [ ] **Step 4: Pass shortlist into Map from App**

Replace `src/App.tsx` with:

```tsx
import { Map } from "./components/Map";
import { data } from "./data";
import { useShortlist } from "./shortlist";

export default function App() {
  const { ids: shortlist } = useShortlist();

  return (
    <div className="app">
      <header className="topbar">
        <h1>MPLS Rentals</h1>
      </header>
      <main className="main">
        <Map listings={data.listings} shortlist={shortlist} />
      </main>
    </div>
  );
}
```

- [ ] **Step 5: Verify in browser**

```bash
npm run dev
```

Expected: pins are now small colored circles (green/yellow-green/orange/red) instead of default blue markers. Cheap listings in green, expensive in red. No stars yet (shortlist is empty). Hover/click still shows popup.

To verify the star overlay works, open browser devtools console and run:
```js
localStorage.setItem("mpls-rentals.shortlist", JSON.stringify(["4807-grand-ave-s-1"]))
```
Refresh. The pin for that listing should show a white star inside.

Clean up:
```js
localStorage.removeItem("mpls-rentals.shortlist")
```

- [ ] **Step 6: Commit**

```bash
git add src/components/Map.tsx src/shortlist.ts src/App.tsx src/styles.css
git commit -m "map: price-quartile pin colors + star overlay for shortlist"
```

---

## Task 7: School / daycare / work markers + layer toggle

**Files:**
- Modify: `src/components/Map.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Replace `src/components/Map.tsx` with the layered version**

`LayersControl` toggles `Layer` children, so we wrap each category of markers in a `<LayerGroup>`.

```tsx
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  LayersControl,
  LayerGroup,
} from "react-leaflet";
import L from "leaflet";
import { useMemo } from "react";
import { type Listing, type Place } from "../data";

const MPLS_CENTER: [number, number] = [44.93, -93.27];
const QUARTILE_COLORS = ["#2e7d32", "#9ccc65", "#ffb300", "#e53935"];

function quartileFor(price: number, breaks: number[]): number {
  for (let i = 0; i < breaks.length; i++) if (price <= breaks[i]) return i;
  return breaks.length;
}

function computeBreaks(prices: number[]): number[] {
  const sorted = [...prices].sort((a, b) => a - b);
  const q = (p: number) => sorted[Math.floor(sorted.length * p)];
  return [q(0.25), q(0.5), q(0.75)];
}

function rentalIcon(color: string, starred: boolean): L.DivIcon {
  return L.divIcon({
    className: "rental-pin",
    html: `<div class="rental-pin__body" style="background:${color}">
      ${starred ? '<span class="rental-pin__star">★</span>' : ""}
    </div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

function placeIcon(emoji: string, bg: string): L.DivIcon {
  return L.divIcon({
    className: "place-pin",
    html: `<div class="place-pin__body" style="background:${bg}">${emoji}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

const SCHOOL_ICON = placeIcon("🎓", "#1565c0");
const DAYCARE_ICON = placeIcon("🧸", "#ef6c00");
const WORK_ICON = placeIcon("💼", "#6a1b9a");

export function Map({
  listings,
  shortlist,
  schools,
  daycares,
  work,
}: {
  listings: Listing[];
  shortlist: Set<string>;
  schools: Place[];
  daycares: Place[];
  work: Place;
}) {
  const breaks = useMemo(
    () => computeBreaks(listings.map((l) => l.price ?? 0).filter((p) => p > 0)),
    [listings]
  );

  return (
    <MapContainer
      center={MPLS_CENTER}
      zoom={12}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <LayersControl position="topright">
        <LayersControl.Overlay checked name="Listings">
          <LayerGroup>
            {listings.map((l) => {
              if (l.lat == null || l.lng == null) return null;
              const q = l.price ? quartileFor(l.price, breaks) : 1;
              const icon = rentalIcon(QUARTILE_COLORS[q], shortlist.has(l.id));
              return (
                <Marker key={l.id} position={[l.lat, l.lng]} icon={icon}>
                  <Popup>
                    <strong>{l.lodging}</strong>
                    <br />
                    ${l.price?.toLocaleString()} · {l.bedrooms}BR
                    {l.school ? ` · ${l.school}` : ""}
                  </Popup>
                </Marker>
              );
            })}
          </LayerGroup>
        </LayersControl.Overlay>

        <LayersControl.Overlay checked name="Schools">
          <LayerGroup>
            {schools.map((s) =>
              s.lat != null && s.lng != null ? (
                <Marker key={s.name} position={[s.lat, s.lng]} icon={SCHOOL_ICON}>
                  <Popup><strong>{s.name}</strong> (school)</Popup>
                </Marker>
              ) : null
            )}
          </LayerGroup>
        </LayersControl.Overlay>

        <LayersControl.Overlay checked name="Daycares">
          <LayerGroup>
            {daycares.map((d) =>
              d.lat != null && d.lng != null ? (
                <Marker key={d.name} position={[d.lat, d.lng]} icon={DAYCARE_ICON}>
                  <Popup><strong>{d.name}</strong> (daycare)</Popup>
                </Marker>
              ) : null
            )}
          </LayerGroup>
        </LayersControl.Overlay>

        <LayersControl.Overlay checked name="Work">
          <LayerGroup>
            {work.lat != null && work.lng != null ? (
              <Marker position={[work.lat, work.lng]} icon={WORK_ICON}>
                <Popup><strong>{work.name}</strong></Popup>
              </Marker>
            ) : null}
          </LayerGroup>
        </LayersControl.Overlay>
      </LayersControl>
    </MapContainer>
  );
}
```

- [ ] **Step 2: Pass schools/daycares/work in App.tsx**

Replace `src/App.tsx`:

```tsx
import { Map } from "./components/Map";
import { data } from "./data";
import { useShortlist } from "./shortlist";

export default function App() {
  const { ids: shortlist } = useShortlist();

  return (
    <div className="app">
      <header className="topbar">
        <h1>MPLS Rentals</h1>
      </header>
      <main className="main">
        <Map
          listings={data.listings}
          shortlist={shortlist}
          schools={data.schools}
          daycares={data.daycares}
          work={data.work}
        />
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Add place pin CSS to `src/styles.css`**

Append:

```css
.place-pin__body {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 2px solid #fff;
  box-shadow: 0 1px 3px rgba(0,0,0,0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}
```

- [ ] **Step 4: Verify in browser**

`npm run dev`. Expected: in addition to the 17 colored circle listing pins, there should now be ~6 blue 🎓 school pins, 3 orange 🧸 daycare pins, and 1 purple 💼 work pin downtown. Top-right of the map: a layers-control widget. Toggle each overlay off and on; the corresponding markers should disappear/reappear.

- [ ] **Step 5: Commit**

```bash
git add src/components/Map.tsx src/App.tsx src/styles.css
git commit -m "map: school/daycare/work markers with layer toggle"
```

---

## Task 8: Filter bar + filter logic

**Files:**
- Create: `src/components/FilterBar.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Create `src/components/FilterBar.tsx`**

```tsx
import { type Listing } from "../data";

export type Filters = {
  priceMax: number;
  bedrooms: Set<number>;
  neighborhoods: Set<string>;
  petFriendlyOnly: boolean;
  shortlistOnly: boolean;
};

export function defaultFilters(listings: Listing[]): Filters {
  const max = Math.max(...listings.map((l) => l.price ?? 0));
  return {
    priceMax: max,
    bedrooms: new Set(),
    neighborhoods: new Set(),
    petFriendlyOnly: false,
    shortlistOnly: false,
  };
}

export function applyFilters(
  listings: Listing[],
  f: Filters,
  shortlist: Set<string>
): Listing[] {
  return listings.filter((l) => {
    if (l.price != null && l.price > f.priceMax) return false;
    if (f.bedrooms.size > 0 && (l.bedrooms == null || !f.bedrooms.has(l.bedrooms))) return false;
    if (f.neighborhoods.size > 0 && (!l.neighborhood || !f.neighborhoods.has(l.neighborhood))) return false;
    if (f.petFriendlyOnly && (l.pet_rent == null || l.pet_rent === "unknown")) return false;
    if (f.shortlistOnly && !shortlist.has(l.id)) return false;
    return true;
  });
}

export function FilterBar({
  listings,
  filters,
  setFilters,
}: {
  listings: Listing[];
  filters: Filters;
  setFilters: (f: Filters) => void;
}) {
  const priceMin = Math.min(...listings.map((l) => l.price ?? Infinity));
  const priceMax = Math.max(...listings.map((l) => l.price ?? 0));

  const allBedrooms = [...new Set(listings.map((l) => l.bedrooms).filter((b): b is number => b != null))].sort();
  const allHoods = [...new Set(listings.map((l) => l.neighborhood).filter((n): n is string => n != null))].sort();

  function toggleSetItem<T>(s: Set<T>, item: T): Set<T> {
    const n = new Set(s);
    n.has(item) ? n.delete(item) : n.add(item);
    return n;
  }

  return (
    <div className="filterbar">
      <label className="filter">
        Max price: ${filters.priceMax.toLocaleString()}
        <input
          type="range"
          min={priceMin}
          max={priceMax}
          step={50}
          value={filters.priceMax}
          onChange={(e) => setFilters({ ...filters, priceMax: Number(e.target.value) })}
        />
      </label>

      <div className="filter">
        <span className="filter__label">Bedrooms</span>
        <div className="chips">
          {allBedrooms.map((b) => (
            <button
              key={b}
              className={`chip ${filters.bedrooms.has(b) ? "chip--on" : ""}`}
              onClick={() => setFilters({ ...filters, bedrooms: toggleSetItem(filters.bedrooms, b) })}
            >
              {b}BR
            </button>
          ))}
        </div>
      </div>

      <div className="filter">
        <span className="filter__label">Neighborhood</span>
        <div className="chips">
          {allHoods.map((h) => (
            <button
              key={h}
              className={`chip ${filters.neighborhoods.has(h) ? "chip--on" : ""}`}
              onClick={() => setFilters({ ...filters, neighborhoods: toggleSetItem(filters.neighborhoods, h) })}
            >
              {h}
            </button>
          ))}
        </div>
      </div>

      <label className="filter filter--check">
        <input
          type="checkbox"
          checked={filters.petFriendlyOnly}
          onChange={(e) => setFilters({ ...filters, petFriendlyOnly: e.target.checked })}
        />
        Pet-friendly only
      </label>

      <label className="filter filter--check">
        <input
          type="checkbox"
          checked={filters.shortlistOnly}
          onChange={(e) => setFilters({ ...filters, shortlistOnly: e.target.checked })}
        />
        Shortlist only
      </label>
    </div>
  );
}
```

- [ ] **Step 2: Wire filters into `App.tsx`**

Replace `src/App.tsx`:

```tsx
import { useMemo, useState } from "react";
import { Map } from "./components/Map";
import { FilterBar, applyFilters, defaultFilters, type Filters } from "./components/FilterBar";
import { data } from "./data";
import { useShortlist } from "./shortlist";

export default function App() {
  const { ids: shortlist } = useShortlist();
  const [filters, setFilters] = useState<Filters>(() => defaultFilters(data.listings));

  const visible = useMemo(
    () => applyFilters(data.listings, filters, shortlist),
    [filters, shortlist]
  );

  return (
    <div className="app">
      <header className="topbar">
        <h1>MPLS Rentals</h1>
        <span className="topbar__count">{visible.length} of {data.listings.length}</span>
      </header>
      <main className="main">
        <aside className="rail">
          <FilterBar listings={data.listings} filters={filters} setFilters={setFilters} />
        </aside>
        <section className="map-area">
          <Map
            listings={visible}
            shortlist={shortlist}
            schools={data.schools}
            daycares={data.daycares}
            work={data.work}
          />
        </section>
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Add layout + filter styles to `src/styles.css`**

Append:

```css
.topbar__count { margin-left: auto; color: #666; font-size: 13px; }
.main { display: flex; }
.rail {
  width: 360px;
  border-right: 1px solid #e5e5e5;
  overflow-y: auto;
  background: #fafafa;
}
.map-area { flex: 1; min-width: 0; }

.filterbar { padding: 12px 16px; display: flex; flex-direction: column; gap: 14px; }
.filter { display: flex; flex-direction: column; gap: 6px; font-size: 13px; }
.filter--check { flex-direction: row; align-items: center; gap: 8px; }
.filter__label { color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; }
.filter input[type="range"] { width: 100%; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chip {
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid #ccc;
  background: #fff;
  font-size: 12px;
  cursor: pointer;
}
.chip--on { background: #1565c0; color: #fff; border-color: #1565c0; }
```

- [ ] **Step 4: Verify in browser**

`npm run dev`. Expected: a left rail with filters, map on the right. Drag the price slider down → expensive pins disappear. Click a bedroom chip → only matching listings remain. Click a neighborhood chip likewise. The "X of Y" counter at top right updates.

- [ ] **Step 5: Commit**

```bash
git add src/components/FilterBar.tsx src/App.tsx src/styles.css
git commit -m "filters: price/bedrooms/neighborhood/pets/shortlist with sidebar layout"
```

---

## Task 9: Listing list (left rail) with cards

**Files:**
- Create: `src/components/ListingCard.tsx`
- Create: `src/components/ListingList.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Create `src/components/ListingCard.tsx`**

```tsx
import { type Listing, type Place } from "../data";
import { chainTimeMin } from "../score";

export function chainTimeFor(l: Listing, schools: Place[], daycares: Place[], work: Place): number | null {
  const school = schools.find((s) => s.name === l.school);
  const daycare = daycares.find((d) => d.name === l.daycare);
  if (!school || !daycare) return null;
  return chainTimeMin({
    homeToSchoolDriveMin: l.dist_school.drive_min,
    homeLat: l.lat,
    homeLng: l.lng,
    school: { lat: school.lat, lng: school.lng },
    daycare: { lat: daycare.lat, lng: daycare.lng },
    work: { lat: work.lat, lng: work.lng },
  });
}

function fmt(n: number | null | undefined, suffix = ""): string {
  return n == null ? "—" : `${n}${suffix}`;
}

export function ListingCard({
  listing,
  shortlisted,
  selected,
  onSelect,
  onToggleStar,
  schools,
  daycares,
  work,
}: {
  listing: Listing;
  shortlisted: boolean;
  selected: boolean;
  onSelect: () => void;
  onToggleStar: () => void;
  schools: Place[];
  daycares: Place[];
  work: Place;
}) {
  const chain = chainTimeFor(listing, schools, daycares, work);

  return (
    <div
      className={`card ${selected ? "card--selected" : ""}`}
      onClick={onSelect}
    >
      <div className="card__head">
        <span className="card__price">${listing.price?.toLocaleString() ?? "?"}</span>
        <span className="card__br">{listing.bedrooms ?? "?"}BR {listing.housing_type ?? ""}</span>
        <button
          className={`card__star ${shortlisted ? "card__star--on" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleStar();
          }}
          title={shortlisted ? "Remove from shortlist" : "Add to shortlist"}
        >
          {shortlisted ? "★" : "☆"}
        </button>
      </div>
      <div className="card__addr">{listing.lodging}</div>
      <div className="card__sub">
        {listing.neighborhood ?? "—"} · {fmt(listing.size_sqft, " sqft")} · ${fmt(listing.price_per_sqft)}/sqft
      </div>
      <div className="card__row">School: {listing.school ?? "—"} ({fmt(listing.dist_school.drive_min, " min drive")})</div>
      <div className="card__row">Daycare: {listing.daycare ?? "—"} ({fmt(listing.dist_daycare.drive_min, " min drive")})</div>
      <div className="card__row">Work: {fmt(listing.dist_work_drive_min, " min drive")}</div>
      <div className="card__row card__chain" title="Estimated home → school → daycare → work">
        Chain time: {chain == null ? "—" : `~${Math.round(chain)} min`}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/ListingList.tsx`**

```tsx
import { type Listing, type Place } from "../data";
import { ListingCard, chainTimeFor } from "./ListingCard";

export type SortKey = "price" | "ppsf" | "chain" | "bedrooms";

export function sortListings(
  listings: Listing[],
  sortKey: SortKey,
  schools: Place[],
  daycares: Place[],
  work: Place
): Listing[] {
  const arr = [...listings];
  switch (sortKey) {
    case "price":
      return arr.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
    case "ppsf":
      return arr.sort((a, b) => (a.price_per_sqft ?? Infinity) - (b.price_per_sqft ?? Infinity));
    case "bedrooms":
      return arr.sort((a, b) => (b.bedrooms ?? 0) - (a.bedrooms ?? 0));
    case "chain":
      return arr.sort((a, b) => {
        const ca = chainTimeFor(a, schools, daycares, work) ?? Infinity;
        const cb = chainTimeFor(b, schools, daycares, work) ?? Infinity;
        return ca - cb;
      });
  }
}

export function ListingList({
  listings,
  shortlist,
  selectedId,
  onSelect,
  onToggleStar,
  sortKey,
  setSortKey,
  schools,
  daycares,
  work,
}: {
  listings: Listing[];
  shortlist: Set<string>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onToggleStar: (id: string) => void;
  sortKey: SortKey;
  setSortKey: (k: SortKey) => void;
  schools: Place[];
  daycares: Place[];
  work: Place;
}) {
  const sorted = sortListings(listings, sortKey, schools, daycares, work);

  return (
    <div className="list">
      <div className="list__head">
        <label className="list__sort">
          Sort:
          <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}>
            <option value="chain">Chain time</option>
            <option value="price">Price</option>
            <option value="ppsf">$/sqft</option>
            <option value="bedrooms">Bedrooms</option>
          </select>
        </label>
      </div>
      <div className="list__cards">
        {sorted.map((l) => (
          <ListingCard
            key={l.id}
            listing={l}
            shortlisted={shortlist.has(l.id)}
            selected={selectedId === l.id}
            onSelect={() => onSelect(l.id)}
            onToggleStar={() => onToggleStar(l.id)}
            schools={schools}
            daycares={daycares}
            work={work}
          />
        ))}
        {sorted.length === 0 ? <div className="list__empty">No listings match.</div> : null}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Wire list into App.tsx**

Replace `src/App.tsx`:

```tsx
import { useMemo, useState } from "react";
import { Map } from "./components/Map";
import { FilterBar, applyFilters, defaultFilters, type Filters } from "./components/FilterBar";
import { ListingList, type SortKey } from "./components/ListingList";
import { data } from "./data";
import { useShortlist } from "./shortlist";

export default function App() {
  const { ids: shortlist, toggle: toggleShortlist } = useShortlist();
  const [filters, setFilters] = useState<Filters>(() => defaultFilters(data.listings));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("chain");

  const visible = useMemo(
    () => applyFilters(data.listings, filters, shortlist),
    [filters, shortlist]
  );

  return (
    <div className="app">
      <header className="topbar">
        <h1>MPLS Rentals</h1>
        <span className="topbar__count">{visible.length} of {data.listings.length}</span>
      </header>
      <main className="main">
        <aside className="rail">
          <FilterBar listings={data.listings} filters={filters} setFilters={setFilters} />
          <ListingList
            listings={visible}
            shortlist={shortlist}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onToggleStar={toggleShortlist}
            sortKey={sortKey}
            setSortKey={setSortKey}
            schools={data.schools}
            daycares={data.daycares}
            work={data.work}
          />
        </aside>
        <section className="map-area">
          <Map
            listings={visible}
            shortlist={shortlist}
            schools={data.schools}
            daycares={data.daycares}
            work={data.work}
          />
        </section>
      </main>
    </div>
  );
}
```

- [ ] **Step 4: Add list/card styles to `src/styles.css`**

Append:

```css
.list { padding: 0 0 16px; }
.list__head {
  padding: 8px 16px;
  border-top: 1px solid #e5e5e5;
  border-bottom: 1px solid #e5e5e5;
}
.list__sort { font-size: 13px; color: #666; }
.list__sort select { margin-left: 6px; padding: 2px 4px; }
.list__cards { display: flex; flex-direction: column; }
.list__empty { padding: 24px; text-align: center; color: #999; }

.card {
  padding: 10px 16px;
  border-bottom: 1px solid #eee;
  cursor: pointer;
  background: #fff;
}
.card:hover { background: #f5f9ff; }
.card--selected { background: #e3f2fd; }
.card__head { display: flex; align-items: center; gap: 8px; }
.card__price { font-weight: 600; font-size: 16px; }
.card__br { color: #666; font-size: 13px; }
.card__star {
  margin-left: auto;
  background: none;
  border: none;
  font-size: 18px;
  color: #ccc;
  cursor: pointer;
  padding: 0 4px;
}
.card__star--on { color: #f9a825; }
.card__addr { font-size: 13px; margin-top: 2px; }
.card__sub { font-size: 12px; color: #666; margin: 2px 0 6px; }
.card__row { font-size: 12px; color: #444; margin: 1px 0; }
.card__chain { font-weight: 500; color: #1565c0; margin-top: 4px; }
```

- [ ] **Step 5: Verify in browser**

`npm run dev`. Expected: left rail now has filter controls AT TOP, then a sort dropdown, then scrollable cards. Each card shows price, bedrooms, address, neighborhood, $/sqft, school/daycare/work distances, chain time. Click a card → it gets a blue background. Click the star → it toggles on/off (yellow). Sort dropdown reorders.

- [ ] **Step 6: Commit**

```bash
git add src/components/ListingCard.tsx src/components/ListingList.tsx src/App.tsx src/styles.css
git commit -m "list: cards with sort + chain time + star"
```

---

## Task 10: Map ↔ list sync (click card → fly to pin + open popup)

**Files:**
- Modify: `src/components/Map.tsx`

When `selectedId` changes from outside the map, we want the map to pan to that pin and open its popup. We use a child component inside `MapContainer` that has access to the `useMap` hook.

- [ ] **Step 1: Add `selectedId` prop and a `Flyer` child component**

Replace `src/components/Map.tsx`:

```tsx
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  LayersControl,
  LayerGroup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { useEffect, useMemo, useRef } from "react";
import { type Listing, type Place } from "../data";

const MPLS_CENTER: [number, number] = [44.93, -93.27];
const QUARTILE_COLORS = ["#2e7d32", "#9ccc65", "#ffb300", "#e53935"];

function quartileFor(price: number, breaks: number[]): number {
  for (let i = 0; i < breaks.length; i++) if (price <= breaks[i]) return i;
  return breaks.length;
}

function computeBreaks(prices: number[]): number[] {
  const sorted = [...prices].sort((a, b) => a - b);
  const q = (p: number) => sorted[Math.floor(sorted.length * p)];
  return [q(0.25), q(0.5), q(0.75)];
}

function rentalIcon(color: string, starred: boolean): L.DivIcon {
  return L.divIcon({
    className: "rental-pin",
    html: `<div class="rental-pin__body" style="background:${color}">
      ${starred ? '<span class="rental-pin__star">★</span>' : ""}
    </div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

function placeIcon(emoji: string, bg: string): L.DivIcon {
  return L.divIcon({
    className: "place-pin",
    html: `<div class="place-pin__body" style="background:${bg}">${emoji}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

const SCHOOL_ICON = placeIcon("🎓", "#1565c0");
const DAYCARE_ICON = placeIcon("🧸", "#ef6c00");
const WORK_ICON = placeIcon("💼", "#6a1b9a");

function FlyToSelected({
  listing,
  markerRef,
}: {
  listing: Listing | null;
  markerRef: React.RefObject<Map<string, L.Marker>>;
}) {
  const map = useMap();
  useEffect(() => {
    if (!listing || listing.lat == null || listing.lng == null) return;
    map.flyTo([listing.lat, listing.lng], Math.max(map.getZoom(), 14), { duration: 0.7 });
    const marker = markerRef.current?.get(listing.id);
    marker?.openPopup();
  }, [listing, map, markerRef]);
  return null;
}

export function Map({
  listings,
  shortlist,
  schools,
  daycares,
  work,
  selectedId,
  onSelect,
}: {
  listings: Listing[];
  shortlist: Set<string>;
  schools: Place[];
  daycares: Place[];
  work: Place;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const breaks = useMemo(
    () => computeBreaks(listings.map((l) => l.price ?? 0).filter((p) => p > 0)),
    [listings]
  );

  const markerRef = useRef(new globalThis.Map<string, L.Marker>());
  const selected = listings.find((l) => l.id === selectedId) ?? null;

  return (
    <MapContainer
      center={MPLS_CENTER}
      zoom={12}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FlyToSelected listing={selected} markerRef={markerRef} />
      <LayersControl position="topright">
        <LayersControl.Overlay checked name="Listings">
          <LayerGroup>
            {listings.map((l) => {
              if (l.lat == null || l.lng == null) return null;
              const q = l.price ? quartileFor(l.price, breaks) : 1;
              const icon = rentalIcon(QUARTILE_COLORS[q], shortlist.has(l.id));
              return (
                <Marker
                  key={l.id}
                  position={[l.lat, l.lng]}
                  icon={icon}
                  ref={(ref) => {
                    if (ref) markerRef.current.set(l.id, ref);
                    else markerRef.current.delete(l.id);
                  }}
                  eventHandlers={{ click: () => onSelect(l.id) }}
                >
                  <Popup>
                    <strong>{l.lodging}</strong>
                    <br />
                    ${l.price?.toLocaleString()} · {l.bedrooms}BR
                    {l.school ? ` · ${l.school}` : ""}
                  </Popup>
                </Marker>
              );
            })}
          </LayerGroup>
        </LayersControl.Overlay>

        <LayersControl.Overlay checked name="Schools">
          <LayerGroup>
            {schools.map((s) =>
              s.lat != null && s.lng != null ? (
                <Marker key={s.name} position={[s.lat, s.lng]} icon={SCHOOL_ICON}>
                  <Popup><strong>{s.name}</strong> (school)</Popup>
                </Marker>
              ) : null
            )}
          </LayerGroup>
        </LayersControl.Overlay>

        <LayersControl.Overlay checked name="Daycares">
          <LayerGroup>
            {daycares.map((d) =>
              d.lat != null && d.lng != null ? (
                <Marker key={d.name} position={[d.lat, d.lng]} icon={DAYCARE_ICON}>
                  <Popup><strong>{d.name}</strong> (daycare)</Popup>
                </Marker>
              ) : null
            )}
          </LayerGroup>
        </LayersControl.Overlay>

        <LayersControl.Overlay checked name="Work">
          <LayerGroup>
            {work.lat != null && work.lng != null ? (
              <Marker position={[work.lat, work.lng]} icon={WORK_ICON}>
                <Popup><strong>{work.name}</strong></Popup>
              </Marker>
            ) : null}
          </LayerGroup>
        </LayersControl.Overlay>
      </LayersControl>
    </MapContainer>
  );
}
```

- [ ] **Step 2: Pass selectedId/onSelect into the Map from App**

Update the `<Map ... />` call in `src/App.tsx`:

```tsx
<Map
  listings={visible}
  shortlist={shortlist}
  schools={data.schools}
  daycares={data.daycares}
  work={data.work}
  selectedId={selectedId}
  onSelect={setSelectedId}
/>
```

- [ ] **Step 3: Verify in browser**

`npm run dev`. Expected: clicking a card in the list → map smoothly flies to that pin and opens its popup. Clicking a pin on the map → corresponding card highlights blue in the list (you may need to scroll the list to see it).

- [ ] **Step 4: Commit**

```bash
git add src/components/Map.tsx src/App.tsx
git commit -m "map: fly-to + popup-open when listing selected"
```

---

## Task 11: Richer popup with all listing details

**Files:**
- Create: `src/components/ListingPopup.tsx`
- Modify: `src/components/Map.tsx`

The current popup shows two lines. Now we replace with a fuller breakdown.

- [ ] **Step 1: Create `src/components/ListingPopup.tsx`**

```tsx
import { type Listing, type Place } from "../data";
import { chainTimeFor } from "./ListingCard";

function fmtDist(d: { walk_min: number | null; drive_min: number | null }) {
  const parts: string[] = [];
  if (d.walk_min != null) parts.push(`${d.walk_min} min walk`);
  if (d.drive_min != null) parts.push(`${d.drive_min} min drive`);
  return parts.length ? parts.join(", ") : "—";
}

export function ListingPopup({
  listing,
  shortlisted,
  onToggleStar,
  schools,
  daycares,
  work,
}: {
  listing: Listing;
  shortlisted: boolean;
  onToggleStar: () => void;
  schools: Place[];
  daycares: Place[];
  work: Place;
}) {
  const chain = chainTimeFor(listing, schools, daycares, work);

  return (
    <div className="popup">
      <div className="popup__head">
        <strong>{listing.lodging}</strong>
        <button className={`popup__star ${shortlisted ? "popup__star--on" : ""}`} onClick={onToggleStar}>
          {shortlisted ? "★" : "☆"}
        </button>
      </div>
      <div className="popup__price">
        ${listing.price?.toLocaleString()} · {listing.bedrooms}BR {listing.housing_type}
        {listing.size_sqft ? ` · ${listing.size_sqft} sqft (${listing.price_per_sqft}/sqft)` : ""}
      </div>
      <div className="popup__hood">{listing.neighborhood ?? "—"}</div>
      <hr />
      <div>School: {listing.school ?? "—"} ({fmtDist(listing.dist_school)})</div>
      <div>Daycare: {listing.daycare ?? "—"} ({fmtDist(listing.dist_daycare)})</div>
      <div>Work: {listing.dist_work_drive_min == null ? "—" : `${listing.dist_work_drive_min} min drive`}</div>
      <div>Chain time: {chain == null ? "—" : `~${Math.round(chain)} min`}</div>
      <hr />
      <div>Parking: {listing.parking ?? "—"}</div>
      <div>Pet rent: {listing.pet_rent === "unknown" ? "?" : listing.pet_rent ?? "—"}</div>
      <div>Furnished: {listing.furnished == null ? "—" : listing.furnished ? "Yes" : "No"}</div>
      <div>Available: {listing.available || "—"}</div>
      <div>Term: {listing.term ?? "—"}</div>
      <div>Utilities: {listing.utilities ?? "—"}</div>
      {listing.notes ? <div className="popup__notes">{listing.notes}</div> : null}
    </div>
  );
}
```

- [ ] **Step 2: Use the popup component in `Map.tsx`**

In `src/components/Map.tsx`, replace the existing `<Popup>...</Popup>` for listings with:

```tsx
import { ListingPopup } from "./ListingPopup";
```

(Add this import near the top.)

Then replace the listing `<Popup>`:

```tsx
<Popup minWidth={260}>
  <ListingPopup
    listing={l}
    shortlisted={shortlist.has(l.id)}
    onToggleStar={() => onToggleStar(l.id)}
    schools={schools}
    daycares={daycares}
    work={work}
  />
</Popup>
```

We need to add `onToggleStar` to the Map props. Update the Map signature:

```tsx
export function Map({
  listings,
  shortlist,
  schools,
  daycares,
  work,
  selectedId,
  onSelect,
  onToggleStar,
}: {
  listings: Listing[];
  shortlist: Set<string>;
  schools: Place[];
  daycares: Place[];
  work: Place;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onToggleStar: (id: string) => void;
}) {
```

- [ ] **Step 3: Pass onToggleStar from App**

In `src/App.tsx`, update the Map call:

```tsx
<Map
  listings={visible}
  shortlist={shortlist}
  schools={data.schools}
  daycares={data.daycares}
  work={data.work}
  selectedId={selectedId}
  onSelect={setSelectedId}
  onToggleStar={toggleShortlist}
/>
```

- [ ] **Step 4: Add popup styles to `src/styles.css`**

Append:

```css
.popup { font-size: 12px; line-height: 1.4; }
.popup__head { display: flex; align-items: center; gap: 8px; }
.popup__star {
  margin-left: auto; background: none; border: none; font-size: 16px;
  color: #ccc; cursor: pointer;
}
.popup__star--on { color: #f9a825; }
.popup__price { margin-top: 4px; font-size: 13px; }
.popup__hood { color: #666; }
.popup hr { border: none; border-top: 1px solid #eee; margin: 6px 0; }
.popup__notes { margin-top: 6px; font-style: italic; color: #555; }
```

- [ ] **Step 5: Verify in browser**

`npm run dev`. Expected: clicking a pin opens a wider popup with the full breakdown — price, bedrooms, schools/daycare/work distances, chain time, parking, pets, furnished, etc. Star button inside the popup toggles shortlist (and the pin gets a star overlay).

- [ ] **Step 6: Commit**

```bash
git add src/components/ListingPopup.tsx src/components/Map.tsx src/App.tsx src/styles.css
git commit -m "popup: full-detail listing popup with star"
```

---

## Task 12: Chain visualization (dashed lines from selected listing → its school + daycare)

**Files:**
- Modify: `src/components/Map.tsx`

- [ ] **Step 1: Add a `Polyline` overlay for the selected listing**

In `src/components/Map.tsx`, add `Polyline` to the react-leaflet imports:

```tsx
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  LayersControl,
  LayerGroup,
  Polyline,
  useMap,
} from "react-leaflet";
```

Then, inside the `MapContainer` (near `<FlyToSelected />`, before `<LayersControl>`), add:

```tsx
{selected && selected.lat != null && selected.lng != null ? (
  <ChainLines selected={selected} schools={schools} daycares={daycares} />
) : null}
```

And define `ChainLines` outside the `Map` function:

```tsx
function ChainLines({
  selected,
  schools,
  daycares,
}: {
  selected: Listing;
  schools: Place[];
  daycares: Place[];
}) {
  const home: [number, number] | null = selected.lat != null && selected.lng != null ? [selected.lat, selected.lng] : null;
  const school = schools.find((s) => s.name === selected.school);
  const daycare = daycares.find((d) => d.name === selected.daycare);

  const segments: [[number, number], [number, number]][] = [];
  if (home && school?.lat != null && school?.lng != null) {
    segments.push([home, [school.lat, school.lng]]);
  }
  if (school?.lat != null && school?.lng != null && daycare?.lat != null && daycare?.lng != null) {
    segments.push([[school.lat, school.lng], [daycare.lat, daycare.lng]]);
  }

  return (
    <>
      {segments.map((s, i) => (
        <Polyline
          key={i}
          positions={s}
          pathOptions={{ color: "#1565c0", weight: 3, opacity: 0.6, dashArray: "6 6" }}
        />
      ))}
    </>
  );
}
```

(We're showing only home→school→daycare since those are the chain segments where proximity matters most. Daycare→work would be a long line cluttering the map.)

- [ ] **Step 2: Verify in browser**

`npm run dev`. Click a card or pin. Expected: two dashed blue lines appear — one from the listing pin to its school 🎓, one from the school to its daycare 🧸. Selecting a different listing updates the lines.

- [ ] **Step 3: Commit**

```bash
git add src/components/Map.tsx
git commit -m "map: dashed chain lines for selected listing → school → daycare"
```

---

## Task 13: Compare view + view toggle

**Files:**
- Create: `src/components/CompareView.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Create `src/components/CompareView.tsx`**

```tsx
import { type Listing, type Place } from "../data";
import { chainTimeFor } from "./ListingCard";

type Row = {
  label: string;
  values: (string | number | null)[];
  bestIndex: number | null;  // index of best value, or null for no highlight
};

function bestMin(values: (number | null)[]): number | null {
  let best = Infinity;
  let idx: number | null = null;
  values.forEach((v, i) => {
    if (v != null && v < best) {
      best = v;
      idx = i;
    }
  });
  return idx;
}

function bestMax(values: (number | null)[]): number | null {
  let best = -Infinity;
  let idx: number | null = null;
  values.forEach((v, i) => {
    if (v != null && v > best) {
      best = v;
      idx = i;
    }
  });
  return idx;
}

function asNum(v: number | null | undefined): number | null {
  return v == null ? null : v;
}

export function CompareView({
  listings,
  schools,
  daycares,
  work,
  onClose,
}: {
  listings: Listing[];
  schools: Place[];
  daycares: Place[];
  work: Place;
  onClose: () => void;
}) {
  if (listings.length === 0) {
    return (
      <div className="compare-empty">
        <p>Star listings to compare them.</p>
        <button onClick={onClose}>Back to map</button>
      </div>
    );
  }

  const chains = listings.map((l) => chainTimeFor(l, schools, daycares, work));

  const rows: Row[] = [
    {
      label: "Price",
      values: listings.map((l) => l.price),
      bestIndex: bestMin(listings.map((l) => asNum(l.price))),
    },
    {
      label: "$ / sqft",
      values: listings.map((l) => l.price_per_sqft),
      bestIndex: bestMin(listings.map((l) => asNum(l.price_per_sqft))),
    },
    {
      label: "Size (sqft)",
      values: listings.map((l) => l.size_sqft),
      bestIndex: bestMax(listings.map((l) => asNum(l.size_sqft))),
    },
    {
      label: "Bedrooms",
      values: listings.map((l) => l.bedrooms),
      bestIndex: bestMax(listings.map((l) => asNum(l.bedrooms))),
    },
    {
      label: "Parking",
      values: listings.map((l) => l.parking),
      bestIndex: null,
    },
    {
      label: "School",
      values: listings.map((l) => l.school),
      bestIndex: null,
    },
    {
      label: "School drive (min)",
      values: listings.map((l) => l.dist_school.drive_min),
      bestIndex: bestMin(listings.map((l) => l.dist_school.drive_min)),
    },
    {
      label: "Daycare",
      values: listings.map((l) => l.daycare),
      bestIndex: null,
    },
    {
      label: "Daycare drive (min)",
      values: listings.map((l) => l.dist_daycare.drive_min),
      bestIndex: bestMin(listings.map((l) => l.dist_daycare.drive_min)),
    },
    {
      label: "Work drive (min)",
      values: listings.map((l) => l.dist_work_drive_min),
      bestIndex: bestMin(listings.map((l) => l.dist_work_drive_min)),
    },
    {
      label: "Chain time (~min)",
      values: chains.map((c) => (c == null ? null : Math.round(c))),
      bestIndex: bestMin(chains.map((c) => (c == null ? null : Math.round(c)))),
    },
    {
      label: "Pet rent",
      values: listings.map((l) => (l.pet_rent === "unknown" ? "?" : l.pet_rent)),
      bestIndex: null,
    },
    {
      label: "Furnished",
      values: listings.map((l) => (l.furnished == null ? "—" : l.furnished ? "Yes" : "No")),
      bestIndex: null,
    },
    {
      label: "Available",
      values: listings.map((l) => l.available),
      bestIndex: null,
    },
    {
      label: "Term",
      values: listings.map((l) => l.term),
      bestIndex: null,
    },
    {
      label: "Utilities",
      values: listings.map((l) => l.utilities),
      bestIndex: null,
    },
    {
      label: "Notes",
      values: listings.map((l) => l.notes),
      bestIndex: null,
    },
  ];

  return (
    <div className="compare">
      <div className="compare__bar">
        <strong>Comparing {listings.length} listing{listings.length === 1 ? "" : "s"}</strong>
        <button onClick={onClose}>← Back to map</button>
      </div>
      <div className="compare__scroll">
        <table className="compare__table">
          <thead>
            <tr>
              <th>Field</th>
              {listings.map((l) => (
                <th key={l.id}>
                  <div>{l.lodging}</div>
                  <div className="compare__sub">{l.neighborhood ?? "—"}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}>
                <th>{r.label}</th>
                {r.values.map((v, i) => (
                  <td key={i} className={r.bestIndex === i ? "compare__best" : ""}>
                    {v == null ? "—" : v.toString()}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add view toggle to `src/App.tsx`**

Replace `src/App.tsx`:

```tsx
import { useMemo, useState } from "react";
import { Map } from "./components/Map";
import { FilterBar, applyFilters, defaultFilters, type Filters } from "./components/FilterBar";
import { ListingList, type SortKey } from "./components/ListingList";
import { CompareView } from "./components/CompareView";
import { data } from "./data";
import { useShortlist } from "./shortlist";

export default function App() {
  const { ids: shortlist, toggle: toggleShortlist } = useShortlist();
  const [filters, setFilters] = useState<Filters>(() => defaultFilters(data.listings));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("chain");
  const [view, setView] = useState<"map" | "compare">("map");

  const visible = useMemo(
    () => applyFilters(data.listings, filters, shortlist),
    [filters, shortlist]
  );
  const shortlisted = useMemo(
    () => data.listings.filter((l) => shortlist.has(l.id)),
    [shortlist]
  );

  return (
    <div className="app">
      <header className="topbar">
        <h1>MPLS Rentals</h1>
        <div className="topbar__tabs">
          <button
            className={view === "map" ? "tab tab--on" : "tab"}
            onClick={() => setView("map")}
          >
            Map
          </button>
          <button
            className={view === "compare" ? "tab tab--on" : "tab"}
            onClick={() => setView("compare")}
          >
            Compare shortlist ({shortlist.size})
          </button>
        </div>
        <span className="topbar__count">{visible.length} of {data.listings.length}</span>
      </header>
      <main className="main">
        {view === "map" ? (
          <>
            <aside className="rail">
              <FilterBar listings={data.listings} filters={filters} setFilters={setFilters} />
              <ListingList
                listings={visible}
                shortlist={shortlist}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onToggleStar={toggleShortlist}
                sortKey={sortKey}
                setSortKey={setSortKey}
                schools={data.schools}
                daycares={data.daycares}
                work={data.work}
              />
            </aside>
            <section className="map-area">
              <Map
                listings={visible}
                shortlist={shortlist}
                schools={data.schools}
                daycares={data.daycares}
                work={data.work}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onToggleStar={toggleShortlist}
              />
            </section>
          </>
        ) : (
          <CompareView
            listings={shortlisted}
            schools={data.schools}
            daycares={data.daycares}
            work={data.work}
            onClose={() => setView("map")}
          />
        )}
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Add compare + tab styles to `src/styles.css`**

Append:

```css
.topbar__tabs { margin-left: 24px; display: flex; gap: 4px; }
.tab {
  padding: 4px 12px;
  border-radius: 6px;
  border: 1px solid #ccc;
  background: #fff;
  font-size: 13px;
  cursor: pointer;
}
.tab--on { background: #1565c0; color: #fff; border-color: #1565c0; }

.compare { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.compare__bar {
  padding: 10px 16px;
  display: flex;
  align-items: center;
  gap: 16px;
  border-bottom: 1px solid #e5e5e5;
}
.compare__bar button { padding: 4px 10px; }
.compare__scroll { flex: 1; overflow: auto; }
.compare__table {
  border-collapse: collapse;
  font-size: 13px;
  min-width: 100%;
}
.compare__table th, .compare__table td {
  padding: 6px 12px;
  border-bottom: 1px solid #eee;
  text-align: left;
  vertical-align: top;
}
.compare__table thead th {
  position: sticky;
  top: 0;
  background: #fafafa;
  border-bottom: 2px solid #ccc;
  min-width: 160px;
}
.compare__table tbody th {
  background: #fafafa;
  position: sticky;
  left: 0;
  z-index: 1;
  font-weight: 500;
  color: #666;
  text-align: right;
  white-space: nowrap;
}
.compare__best { background: #e8f5e9; font-weight: 600; }
.compare__sub { font-size: 11px; color: #888; font-weight: normal; }
.compare-empty { padding: 48px; text-align: center; color: #666; }
.compare-empty button { margin-top: 12px; padding: 6px 16px; }
```

- [ ] **Step 4: Verify in browser**

`npm run dev`. Star 2-3 listings via cards or popups. Click "Compare shortlist (N)" tab in the top bar. Expected: a side-by-side table with one column per shortlisted listing, the best value in each numeric row highlighted green. Click "Back to map" — returns to map+list view. The shortlist count in the tab updates as you star/unstar.

If the shortlist is empty, clicking the tab shows an empty state.

- [ ] **Step 5: Commit**

```bash
git add src/components/CompareView.tsx src/App.tsx src/styles.css
git commit -m "compare: side-by-side shortlist table with best-value highlighting"
```

---

## Task 14: Final smoke test + cleanup

**Files:** none (verification + small cleanups only)

- [ ] **Step 1: Run all checks**

```bash
npm test                  # vitest — should pass
npx tsc -b --noEmit       # type check — should pass
npm run build             # production build — should succeed
npm run preview           # serves dist/ — open the URL
```

- [ ] **Step 2: Smoke-test checklist (in `npm run dev`)**

Walk through this list. Each item should work as described.

- [ ] Map shows ~17 colored circle pins, plus school/daycare/work pins
- [ ] Layer toggle (top-right of map) hides/shows each category
- [ ] Hovering a pin shows nothing extra; clicking opens the full popup
- [ ] Filter bar:
  - [ ] Price slider hides expensive listings
  - [ ] Bedrooms chips filter (multi-select)
  - [ ] Neighborhood chips filter (multi-select)
  - [ ] Pet-friendly checkbox hides listings with no pet info
  - [ ] Shortlist-only checkbox restricts to starred ones
- [ ] Sort dropdown reorders the list (chain time / price / $/sqft / bedrooms)
- [ ] Click a card → map flies to that pin and opens the popup; card highlights blue
- [ ] Click a pin → corresponding card highlights blue
- [ ] When a listing is selected, dashed blue lines connect listing → school → daycare
- [ ] Star a listing (card OR popup) → pin gets a white star overlay; persists after page reload
- [ ] "Compare shortlist" tab opens a side-by-side table; best values highlighted green
- [ ] Empty shortlist → compare view shows an empty state

- [ ] **Step 3: Final commit if any cleanup**

```bash
git status
# If changes: stage and commit "polish: cleanup" or similar
```

- [ ] **Step 4: Done.** The app is feature-complete per the spec. To deploy: `npm run build` produces a static `dist/` folder you can host anywhere, or open directly in a browser.

---

## Self-review notes

**Spec coverage check** (items in spec → tasks that implement):
- Architecture / file structure → Tasks 1, 5, 8, 9
- Data prep, geocoding, distance parsing → Task 2
- Listing data model → Task 3
- Score (chain time) → Task 4
- Map with listing pins, price quartile coloring, star overlay → Tasks 5, 6
- School/daycare/work markers + layer toggle → Task 7
- Filters (price, bedrooms, neighborhood, pet, shortlist) → Task 8
- Listing list with cards + sort → Task 9
- List ↔ map sync → Task 10
- Full-detail popup → Task 11
- Chain visualization lines → Task 12
- Compare view with best-value highlighting → Task 13
- Localstorage shortlist persistence → Task 6 (`shortlist.ts`), used throughout
- Error handling (null lat/lng, missing fields) → Tasks 5, 9, 11 (each renders `—` for nulls; pin renders only when lat/lng present)
- Manual testing → Task 14

All spec sections have at least one task. No gaps found.

**Type consistency check**: `Listing`, `Place`, `DataFile`, `Filters`, `ChainInputs`, `SortKey` are defined once and consumed consistently. The `Map` component's prop list grows across tasks 5→7→10→11; final shape is verified in Task 11. `chainTimeFor` is defined in Task 9 (`ListingCard.tsx`) and reused in Tasks 9, 11, 12, 13.

**Placeholder scan**: no TBD/TODO/"add appropriate error handling"/"similar to Task N" patterns. Code blocks are complete.
