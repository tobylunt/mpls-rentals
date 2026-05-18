import { type Listing } from "../data";
import { type Disqualifications } from "../userdata";

export type Filters = {
  priceMax: number;
  bedrooms: Set<number>;
  neighborhoods: Set<string>;
  shortlistOnly: boolean;
  hideDisqualified: boolean;
};

export function defaultFilters(listings: Listing[]): Filters {
  const max = Math.max(...listings.map((l) => l.price ?? 0));
  return {
    priceMax: max,
    bedrooms: new Set(),
    neighborhoods: new Set(),
    shortlistOnly: false,
    hideDisqualified: true,
  };
}

export function applyFilters(
  listings: Listing[],
  f: Filters,
  shortlist: Set<string>,
  disqualifications: Disqualifications
): Listing[] {
  return listings.filter((l) => {
    if (l.price != null && l.price > f.priceMax) return false;
    if (f.bedrooms.size > 0 && (l.bedrooms == null || !f.bedrooms.has(l.bedrooms))) return false;
    if (f.neighborhoods.size > 0 && (!l.neighborhood || !f.neighborhoods.has(l.neighborhood))) return false;
    if (f.shortlistOnly && !shortlist.has(l.id)) return false;
    if (f.hideDisqualified && disqualifications[l.id]) return false;
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
          checked={filters.shortlistOnly}
          onChange={(e) => setFilters({ ...filters, shortlistOnly: e.target.checked })}
        />
        Shortlist only
      </label>

      <label className="filter filter--check">
        <input
          type="checkbox"
          checked={filters.hideDisqualified}
          onChange={(e) => setFilters({ ...filters, hideDisqualified: e.target.checked })}
        />
        Hide disqualified
      </label>
    </div>
  );
}
