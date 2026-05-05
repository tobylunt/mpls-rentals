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
      {listing.image_url ? (
        <a
          className="popup__thumb"
          href={listing.url ?? "#"}
          target="_blank"
          rel="noopener noreferrer"
        >
          <img
            src={listing.image_url}
            alt={listing.lodging}
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.currentTarget.parentElement as HTMLAnchorElement).style.display = "none";
            }}
          />
        </a>
      ) : null}
      <div className="popup__price">
        ${listing.price?.toLocaleString()} · {listing.bedrooms}BR {listing.housing_type}
        {listing.size_sqft ? ` · ${listing.size_sqft} sqft (${listing.price_per_sqft}/sqft)` : ""}
      </div>
      <div className="popup__hood">{listing.neighborhood ?? "—"}</div>
      {listing.url ? (
        <a className="popup__link" href={listing.url} target="_blank" rel="noopener noreferrer">
          View original listing ↗
        </a>
      ) : null}
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
