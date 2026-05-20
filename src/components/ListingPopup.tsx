import { type Listing, type Place } from "../data";
import { chainTimeFor } from "./ListingCard";

function fmtDist(d: { walk_min: number | null; drive_min: number | null }) {
  const parts: string[] = [];
  if (d.walk_min != null) parts.push(`${d.walk_min} min walk`);
  if (d.drive_min != null) parts.push(`${d.drive_min} min drive`);
  return parts.length ? parts.join(", ") : "—";
}

function RatingStars({
  rating,
  onChange,
}: {
  rating: number;
  onChange: (next: number | null) => void;
}) {
  return (
    <div className="rating" role="radiogroup" aria-label="Your rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={`rating__star ${rating >= n ? "rating__star--on" : ""}`}
          onClick={() => onChange(rating === n ? null : n)}
          title={`${n} star${n === 1 ? "" : "s"}`}
          aria-label={`${n} star${n === 1 ? "" : "s"}`}
        >
          {rating >= n ? "★" : "☆"}
        </button>
      ))}
      {rating > 0 ? (
        <button type="button" className="rating__clear" onClick={() => onChange(null)} title="Clear rating">
          ✕
        </button>
      ) : null}
    </div>
  );
}

export function ListingPopup({
  listing,
  shortlisted,
  onToggleStar,
  schools,
  daycares,
  note,
  pros,
  cons,
  application,
  rating,
  disqualification,
  onNoteChange,
  onProsChange,
  onConsChange,
  onApplicationChange,
  onRatingChange,
  onDisqualificationChange,
}: {
  listing: Listing;
  shortlisted: boolean;
  onToggleStar: () => void;
  schools: Place[];
  daycares: Place[];
  note: string;
  pros: string;
  cons: string;
  application: string;
  rating: number;
  disqualification: string;
  onNoteChange: (text: string) => void;
  onProsChange: (text: string) => void;
  onConsChange: (text: string) => void;
  onApplicationChange: (url: string) => void;
  onRatingChange: (rating: number | null) => void;
  onDisqualificationChange: (reason: string | null) => void;
}) {
  const chain = chainTimeFor(listing, schools, daycares);
  const removed = listing.status === "removed";
  const disqualified = disqualification !== "";

  return (
    <div className={`popup ${removed ? "popup--removed" : ""} ${disqualified ? "popup--disqualified" : ""}`}>
      <div className="popup__head">
        <strong>{listing.lodging}</strong>
        {removed ? <span className="card__removed-tag">OFF MARKET</span> : null}
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
      <div className="popup__links">
        {listing.url ? (
          <a className="popup__link" href={listing.url} target="_blank" rel="noopener noreferrer">
            Original listing ↗
          </a>
        ) : null}
        {listing.lat != null && listing.lng != null ? (
          <a
            className="popup__link"
            href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${listing.lat},${listing.lng}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Street View ↗
          </a>
        ) : null}
      </div>
      <hr />
      <RatingStars rating={rating} onChange={onRatingChange} />
      <textarea
        className="popup__note-input"
        placeholder="Your notes…"
        value={note}
        onChange={(e) => onNoteChange(e.target.value)}
        rows={3}
      />
      <div className="popup__proscons">
        <textarea
          className="popup__proscons-input popup__proscons-input--pros"
          placeholder="Pros…"
          value={pros}
          onChange={(e) => onProsChange(e.target.value)}
          rows={3}
        />
        <textarea
          className="popup__proscons-input popup__proscons-input--cons"
          placeholder="Cons…"
          value={cons}
          onChange={(e) => onConsChange(e.target.value)}
          rows={3}
        />
      </div>
      <div className="popup__dq">
        {disqualified ? (
          <>
            <span className="popup__dq-label" title={`Disqualified: ${disqualification}`}>
              👎 Out: <em>{disqualification}</em>
            </span>
            <button
              type="button"
              className="popup__dq-clear"
              onClick={() => onDisqualificationChange(null)}
              title="Un-disqualify this listing"
            >
              ✕
            </button>
          </>
        ) : (
          <button
            type="button"
            className="popup__dq-button"
            onClick={() => {
              const reason = prompt("Why disqualify this listing?\n(e.g. wrong school, too small, no parking)");
              if (reason && reason.trim()) onDisqualificationChange(reason.trim());
            }}
            title="Rule this listing out with a reason"
          >
            👎 Disqualify…
          </button>
        )}
      </div>
      <div className="popup__app">
        <label className="popup__app-label">Application URL</label>
        <div className="popup__app-row">
          <input
            type="url"
            className="popup__app-input"
            placeholder="Paste from agent…"
            value={application}
            onChange={(e) => onApplicationChange(e.target.value)}
          />
          {application ? (
            <a
              href={application}
              target="_blank"
              rel="noopener noreferrer"
              className="popup__app-go"
              title="Open application"
            >
              Apply →
            </a>
          ) : null}
        </div>
      </div>
      <hr />
      <div>School: {listing.school ?? "—"} ({fmtDist(listing.dist_school)})</div>
      <div>Daycare: {listing.daycare ?? "—"} ({fmtDist(listing.dist_daycare)})</div>
      <div>Work: {listing.dist_work_drive_min == null ? "—" : `${listing.dist_work_drive_min} min drive`}</div>
      <div>Chain time: {chain == null ? "—" : `~${Math.round(chain)} min`}</div>
      <hr />
      <div>Parking: {listing.parking ?? "—"}</div>
      <div>Pet rent: {listing.pet_rent === "unknown" ? "?" : listing.pet_rent ?? "—"}</div>
      <div>Furnished: {listing.furnished == null ? "—" : listing.furnished ? "Yes" : "No"}</div>
      <div>Move-in date: {listing.available || "—"}</div>
      <div>Term: {listing.term ?? "—"}</div>
      <div>Utilities: {listing.utilities ?? "—"}</div>
      {listing.notes ? <div className="popup__notes">{listing.notes}</div> : null}
    </div>
  );
}
