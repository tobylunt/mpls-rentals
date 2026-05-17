import { type Listing, type Place } from "../data";
import { type Notes, type Ratings } from "../userdata";
import { ListingCard, chainTimeFor } from "./ListingCard";

export type SortKey = "price" | "ppsf" | "chain" | "bedrooms" | "rating";

export function sortListings(
  listings: Listing[],
  sortKey: SortKey,
  schools: Place[],
  daycares: Place[],
  ratings: Ratings
): Listing[] {
  const arr = [...listings];
  // Always sink removed listings to the bottom regardless of primary sort.
  const byStatus = (a: Listing, b: Listing) =>
    (a.status === "removed" ? 1 : 0) - (b.status === "removed" ? 1 : 0);
  switch (sortKey) {
    case "price":
      return arr.sort((a, b) => byStatus(a, b) || (a.price ?? Infinity) - (b.price ?? Infinity));
    case "ppsf":
      return arr.sort((a, b) => byStatus(a, b) || (a.price_per_sqft ?? Infinity) - (b.price_per_sqft ?? Infinity));
    case "bedrooms":
      return arr.sort((a, b) => byStatus(a, b) || (b.bedrooms ?? 0) - (a.bedrooms ?? 0));
    case "rating":
      return arr.sort(
        (a, b) => byStatus(a, b) || (ratings[b.id] ?? 0) - (ratings[a.id] ?? 0)
      );
    case "chain":
      return arr.sort((a, b) => {
        const s = byStatus(a, b);
        if (s !== 0) return s;
        const ca = chainTimeFor(a, schools, daycares) ?? Infinity;
        const cb = chainTimeFor(b, schools, daycares) ?? Infinity;
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
  notes,
  ratings,
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
  notes: Notes;
  ratings: Ratings;
}) {
  const sorted = sortListings(listings, sortKey, schools, daycares, ratings);

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
            <option value="rating">Rating</option>
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
            note={notes[l.id]}
            rating={ratings[l.id]}
          />
        ))}
        {sorted.length === 0 ? <div className="list__empty">No listings match.</div> : null}
      </div>
    </div>
  );
}
