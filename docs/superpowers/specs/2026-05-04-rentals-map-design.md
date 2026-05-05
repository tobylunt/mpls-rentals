# Minneapolis Rentals Map — Design

## Goal

An interactive map-based tool for evaluating rental listings against family-relevant criteria (price, size, schools, daycare, work commute). Optimized for the 80/20 of "which place should we actually pick" — not a generic listings browser.

Source data: `2026 MPLS housing.xlsx` in the project root, ~17 listings.

## Stack

- **React + Vite + TypeScript** (single-page app, no router)
- **Leaflet** via `react-leaflet` for the map
- **OpenStreetMap** tiles (no API key)
- **localStorage** for shortlist persistence
- **No backend.** `npm run build` produces a static `dist/` folder that can be opened directly or hosted anywhere.

## File layout

```
mpls-rentals/
├── 2026 MPLS housing.xlsx         # source of truth, kept here
├── scripts/
│   └── build_data.py              # one-shot data prep: Excel → JSON, geocodes, distances
├── public/
│   └── data/listings.json         # generated output, committed
├── src/
│   ├── main.tsx
│   ├── App.tsx                    # top-level layout + view-toggle state
│   ├── data.ts                    # loads + typed listings.json
│   ├── filters.ts                 # filter state + predicate helpers (pure functions)
│   ├── score.ts                   # chain-time + hassle calculations (pure)
│   ├── components/
│   │   ├── Map.tsx                # listing pins, school/daycare/work pins, layer toggle
│   │   ├── FilterBar.tsx          # price slider, bedrooms, neighborhood, pets, shortlist-only
│   │   ├── ListingList.tsx        # left-rail list of cards
│   │   ├── ListingCard.tsx        # used in both list and compare contexts
│   │   ├── ListingPopup.tsx       # full-detail content for map popup
│   │   └── CompareView.tsx        # side-by-side table of shortlisted listings
│   └── styles.css
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Data model

```ts
type Distance = { walk_min: number | null; drive_min: number | null; raw: string };

type Listing = {
  id: string;                       // slug of address
  lodging: string;                  // raw "Lodging" cell
  address: string;                  // resolved street address (after building-name lookup)
  lat: number | null;               // null if geocoding failed
  lng: number | null;
  bedrooms: number;                 // parsed from "2BR apt" → 2
  housing_type: string;             // "apt" | "house" | "condo" | "duplex"
  neighborhood: string | null;
  price: number | null;
  pet_rent: number | null | "unknown";
  furnished: boolean | null;
  parking: string | null;
  size_sqft: number | null;
  price_per_sqft: number | null;
  available: string;                // ISO date or "Now" or "?"
  term: string | null;
  school: string | null;            // e.g., "Lake Harriet"
  daycare: string | null;           // e.g., "Casa de Corazon — 50th and France"
  dist_school: Distance;
  dist_daycare: Distance;
  dist_work_drive_min: number | null;   // bare numbers in this column = drive minutes
  utilities: string | null;
  notes: string | null;
};

type Place = { name: string; lat: number; lng: number };

type DataFile = {
  listings: Listing[];
  schools: Place[];                 // unique elementary schools
  daycares: Place[];                // unique Casa de Corazon locations
  work: Place;                      // McKnight Foundation, downtown Minneapolis
};
```

## Data prep (`scripts/build_data.py`)

Run once (and any time the spreadsheet changes):

1. Read `2026 MPLS housing.xlsx`, skip empty trailing rows.
2. Parse cells:
   - **Bedrooms**: regex `(\d)BR (\w+)` → `bedrooms`, `housing_type`.
   - **Price/size**: numeric, allow null.
   - **Pet rent**: `?` → `"unknown"`, blank → `null`, number → number.
   - **Distances** (`dist_school`, `dist_daycare`): regex on `"X min walk (Y)"` → `{walk_min: X, drive_min: Y, raw: original}`. Walk-only ("8 min walk") → `drive_min: null`. Bare numbers like `"13 (4)"` → walk=13, drive=4.
   - **Distance to work**: bare integer → drive minutes. `"No route"` → `null`.
3. Resolve "Lodging" to a street address:
   - Looks like a street address (regex `^\d+\s+\w`) → use as-is, append ", Minneapolis, MN" if not already specified.
   - Named buildings ("Sanctuary Lofts", "Linden 43 Unit 410", "The Collection C5", "Noko apartments") → hardcoded lookup table in the script. Filled by web search during data prep.
4. Geocode each listing via Nominatim (`https://nominatim.openstreetmap.org/search`), respecting the 1 req/sec rate limit. Cache results in `scripts/.geocode_cache.json` so reruns are free. Listings that fail geocoding get `lat: null, lng: null` and a console warning.
5. Build the unique `schools` and `daycares` lists from the listings, geocode each once.
6. Add work location: McKnight Foundation, 710 S 2nd St, Minneapolis, MN 55401 (geocoded).
7. Write `public/data/listings.json`.

The script is idempotent and resumable via the cache. It's allowed to be ugly — it runs once.

## Scoring (`src/score.ts`)

### Chain time (the primary livability metric)

Models the morning routine as a single chain:

```
home → school → daycare → work
```

For each listing:
- `home → school` = `dist_school.drive_min` (from data; fall back to straight-line × 2.5 min/km if missing)
- `school → daycare` = straight-line km between geocoded school and daycare × 2.5 min/km
- `daycare → work` = straight-line km between daycare and McKnight × 2.5 min/km

Returns `chain_time_min: number | null` (null if school or daycare lat/lng missing).

The middle term naturally penalizes school+daycare being far apart — captures the user's "if they're in opposite directions, that's much more of a hassle" insight.

This is an estimate, not a routing engine. Good enough for ranking; obvious caveat shown in the UI tooltip ("estimated from straight-line distances").

### Pure functions, no React state

Score functions take a `Listing` + the `DataFile.schools/daycares/work` indexes and return a number. Trivially testable; no hooks.

## UI

### Layout (desktop-first; mobile is "works but not optimized")

```
┌────────────────────────────────────────────────────────────┐
│  MPLS Rentals    [Map]  [Compare shortlist (3)]            │  top bar
├────────────┬───────────────────────────────────────────────┤
│  Filters   │                                               │
│  ────────  │                                               │
│  Price     │                                               │
│  Bedrooms  │              Map (Leaflet)                    │
│  Hood      │                                               │
│  Pets      │                                               │
│  ☐ Shortlist only                                          │
│            │                                               │
│  ── List ─ │                                               │
│  [card]    │                                               │
│  [card]    │                                               │
│  [card]    │                                               │
│  …         │                                               │
└────────────┴───────────────────────────────────────────────┘
```

- Left rail ~360px wide, scrollable. Right side fills.
- Sort dropdown above list: price asc, $/sqft asc, chain time asc (default), bedrooms desc.

### Map

- Listing pins: colored by **price quartile** (green=cheapest → red=priciest). Star overlay if shortlisted.
- Hover tooltip: `$2,150 · 2BR · Burroughs`.
- Click pin → opens popup with full details + star button.
- School pins: graduation-cap icon, blue.
- Daycare pins: child/building icon, orange.
- Work pin: briefcase icon, purple.
- **Layer toggle** (top-right): listings / schools / daycares / work — each can be hidden.
- When a listing is selected (clicked in list or map), draw faint dashed lines from that listing → its school + its daycare. Visualizes the chain.

### List card

Each card shows:
```
$2,150  ·  2BR apt  ·  ★
4807 Grand Ave S #1
Tangletown · 1,300 sqft · $1.65/sqft
School: Burroughs (4 min drive)
Daycare: Casa Kingfield (5 min drive)
Chain time: ~28 min
```
Click → flies map to pin and opens its popup. Star button toggles shortlist.

### Compare view

Replaces map+list when toggled. One column per shortlisted listing, rows: address, price, $/sqft, size, bedrooms, parking, school, school dist, daycare, daycare dist, work drive, **chain time**, pets, furnished, utilities, notes.

The cell with the best value in each row is highlighted (cheapest price, biggest size, shortest commutes/chain time). For categorical rows (parking, pets) no highlight.

If shortlist is empty: empty state with "Star listings to compare them."

### Filters

- **Price range**: dual-handle slider, defaults to data min/max.
- **Bedrooms**: chip multi-select (1, 2, 3, 4+).
- **Neighborhood**: chip multi-select, populated from data.
- **Pet-friendly**: checkbox. When checked, hides listings whose `pet_rent` is `null` or `"unknown"` (i.e., shows only places we know accept pets). Unchecked = show all.
- **Shortlist only**: checkbox.

Filter state lives in `App.tsx`. List and map both render the same filtered subset.

## Error handling

- Listings with `lat: null`: shown in the list with a "📍 no map location" badge; not on the map.
- Missing fields: rendered as `—` in cards/popups/compare view.
- Chain time `null` (missing school/daycare geocode): shown as `—`, sorts to bottom.
- localStorage failures: caught and ignored; shortlist works in-session, just doesn't persist.

## Out of scope

- Authentication, multi-user, sharing.
- Mobile-optimized layout (works, not polished).
- Adding new listings via the UI — edit Excel and re-run `build_data.py`.
- Routing-engine drive times (OSRM); straight-line × 2.5 min/km is good enough for ranking.
- Automated tests. Verification is manual in the browser.
- **Future:** toggleable route layer showing actual walking/driving directions on the map (home → school, school → daycare, daycare → work). Would require a routing API (OSRM, Mapbox Directions, or similar). Tracked here so we don't lose the idea.

## Dependencies

```
react, react-dom
react-leaflet, leaflet
typescript, vite, @vitejs/plugin-react
```

Python script:
```
openpyxl, requests
```
