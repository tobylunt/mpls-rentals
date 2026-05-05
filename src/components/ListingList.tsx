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
