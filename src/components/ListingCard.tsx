import { type Listing, type Place } from "../data";
import { type MarketStatus, type Tour, statusLabel } from "../userdata";
import { chainTimeMin } from "../score";

export function chainTimeFor(l: Listing, schools: Place[], daycares: Place[]): number | null {
  const school = schools.find((s) => s.name === l.school);
  const daycare = daycares.find((d) => d.name === l.daycare);
  if (!school || !daycare) return null;
  return chainTimeMin({
    homeToSchoolDriveMin: l.dist_school.drive_min,
    homeLat: l.lat,
    homeLng: l.lng,
    school: { lat: school.lat, lng: school.lng },
    daycare: { lat: daycare.lat, lng: daycare.lng },
  });
}

function fmt(n: number | null | undefined, suffix = ""): string {
  return n == null ? "—" : `${n}${suffix}`;
}

export function formatTour(tour: Tour): string {
  if (!tour.at) return tour.status === "confirmed" ? "Tour ✓" : "Tour TBD";
  const d = new Date(tour.at);
  const day = d.toLocaleDateString("en-US", { weekday: "short" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).replace(/\s/g, "").toLowerCase();
  const prefix = tour.status === "confirmed" ? "Tour ✓" : "Tour";
  return `${prefix} ${day} ${time}`;
}

export function marketStatusLabel(s: MarketStatus): string {
  return s === "probably_rented" ? "Likely rented" : s === "rented" ? "Rented" : "On hold";
}

export function ListingCard({
  listing,
  shortlisted,
  selected,
  onSelect,
  onToggleStar,
  schools,
  daycares,
  note,
  rating,
  tour,
  marketStatus,
  disqualification,
}: {
  listing: Listing;
  shortlisted: boolean;
  selected: boolean;
  onSelect: () => void;
  onToggleStar: () => void;
  schools: Place[];
  daycares: Place[];
  note: string | undefined;
  rating: number | undefined;
  tour: Tour | undefined;
  marketStatus: MarketStatus | undefined;
  disqualification: string | undefined;
}) {
  const chain = chainTimeFor(listing, schools, daycares);
  const removed = listing.status === "removed";
  const hasNote = note != null && note.trim() !== "";
  const disqualified = !!disqualification;
  // Build the same status-line shown on map pin tooltip; expose it as a
  // hover title on the card too. Notes-only path uses the in-card data
  // we already have rather than re-passing whole maps.
  const tourMap = tour ? { [listing.id]: tour } : {};
  const msMap = marketStatus ? { [listing.id]: marketStatus } : {};
  const dqMap = disqualification ? { [listing.id]: disqualification } : {};
  const noteMap = note ? { [listing.id]: note } : {};
  const status = statusLabel(listing.id, listing.status, tourMap, msMap, dqMap, noteMap);
  const titleParts = [listing.lodging];
  if (status) titleParts.push(status);
  if (note) titleParts.push(`Note: ${note}`);

  return (
    <div
      className={`card ${selected ? "card--selected" : ""} ${removed ? "card--removed" : ""} ${disqualified ? "card--disqualified" : ""}`}
      onClick={onSelect}
      title={titleParts.join(" — ")}
    >
      <div className="card__head">
        <span className="card__price">${listing.price?.toLocaleString() ?? "?"}</span>
        <span className="card__br">{listing.bedrooms ?? "?"}BR {listing.housing_type ?? ""}</span>
        {removed ? <span className="card__removed-tag">OFF MARKET</span> : null}
        {disqualified ? (
          <span className="card__dq-tag" title={`Disqualified: ${disqualification}`}>
            👎 {disqualification}
          </span>
        ) : null}
        {tour ? (
          <span className={`card__tour-tag ${tour.status === "confirmed" ? "card__tour-tag--confirmed" : ""}`} title={tour.at ? `Tour ${tour.status}: ${new Date(tour.at).toLocaleString()}` : `Tour ${tour.status}`}>
            {formatTour(tour)}
          </span>
        ) : null}
        {marketStatus ? (
          <span
            className={`card__status-tag card__status-tag--${marketStatus}`}
            title={marketStatusLabel(marketStatus)}
          >
            {marketStatusLabel(marketStatus)}
          </span>
        ) : null}
        {rating ? (
          <span className="card__rating" title={`Your rating: ${rating}/5`}>
            {"★".repeat(rating)}<span className="card__rating--empty">{"★".repeat(5 - rating)}</span>
          </span>
        ) : null}
        {hasNote ? <span className="card__note-indicator" title="You have notes on this listing">📝</span> : null}
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
      <div className="card__row card__chain" title="Estimated home → school → daycare">
        Chain time: {chain == null ? "—" : `~${Math.round(chain)} min`}
      </div>
    </div>
  );
}
