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
