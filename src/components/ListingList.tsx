import { type Listing, type Place } from "../data";
import { type Notes, type Ratings, type Tours, type MarketStatuses } from "../userdata";
import { ListingCard, chainTimeFor, formatTour } from "./ListingCard";

export type SortKey = "price" | "ppsf" | "chain" | "bedrooms" | "rating";

// 0 = active, 1 = on_hold, 2 = probably_rented, 3 = rented or status=removed
function statusRank(l: Listing, marketStatuses: MarketStatuses): number {
  if (l.status === "removed") return 3;
  const ms = marketStatuses[l.id];
  if (ms === "rented") return 3;
  if (ms === "probably_rented") return 2;
  if (ms === "on_hold") return 1;
  return 0;
}

export function sortListings(
  listings: Listing[],
  sortKey: SortKey,
  schools: Place[],
  daycares: Place[],
  ratings: Ratings,
  marketStatuses: MarketStatuses
): Listing[] {
  const arr = [...listings];
  const byStatus = (a: Listing, b: Listing) =>
    statusRank(a, marketStatuses) - statusRank(b, marketStatuses);
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

function UpcomingToursStrip({
  listings,
  tours,
  onSelect,
}: {
  listings: Listing[];
  tours: Tours;
  onSelect: (id: string) => void;
}) {
  const now = Date.now();
  const upcoming = listings
    .map((l) => ({ listing: l, tour: tours[l.id] }))
    .filter((x) => x.tour && (!x.tour.at || new Date(x.tour.at).getTime() > now - 86_400_000))
    .sort((a, b) => {
      // Sort by date if present, otherwise to end
      const aT = a.tour!.at ? new Date(a.tour!.at).getTime() : Infinity;
      const bT = b.tour!.at ? new Date(b.tour!.at).getTime() : Infinity;
      return aT - bT;
    });

  if (upcoming.length === 0) return null;

  return (
    <div className="tours-strip">
      <div className="tours-strip__label">📅 Upcoming tours</div>
      <div className="tours-strip__items">
        {upcoming.map(({ listing, tour }) => (
          <button
            key={listing.id}
            className={`tours-strip__item ${tour!.status === "confirmed" ? "tours-strip__item--confirmed" : ""}`}
            onClick={() => onSelect(listing.id)}
            title={`${listing.lodging} — ${tour!.at ? new Date(tour!.at).toLocaleString() : "date TBD"} (${tour!.status})`}
          >
            <span className="tours-strip__when">{formatTour(tour!).replace(/^Tour ✓?\s*/, "")}</span>
            <span className="tours-strip__addr">{listing.lodging}</span>
          </button>
        ))}
      </div>
    </div>
  );
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
  tours,
  marketStatuses,
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
  tours: Tours;
  marketStatuses: MarketStatuses;
}) {
  const sorted = sortListings(listings, sortKey, schools, daycares, ratings, marketStatuses);

  return (
    <div className="list">
      <UpcomingToursStrip listings={listings} tours={tours} onSelect={onSelect} />
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
            tour={tours[l.id]}
            marketStatus={marketStatuses[l.id]}
          />
        ))}
        {sorted.length === 0 ? <div className="list__empty">No listings match.</div> : null}
      </div>
    </div>
  );
}
