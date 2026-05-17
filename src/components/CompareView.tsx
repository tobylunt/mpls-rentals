import { type Listing, type Place } from "../data";
import { type Notes, type Ratings, type Tours, type MarketStatuses } from "../userdata";
import { chainTimeFor, formatTour, marketStatusLabel } from "./ListingCard";

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
  notes,
  ratings,
  tours,
  marketStatuses,
  onClose,
}: {
  listings: Listing[];
  schools: Place[];
  daycares: Place[];
  notes: Notes;
  ratings: Ratings;
  tours: Tours;
  marketStatuses: MarketStatuses;
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

  const chains = listings.map((l) => chainTimeFor(l, schools, daycares));

  const rows: Row[] = [
    {
      label: "Tour",
      values: listings.map((l) => (tours[l.id] ? formatTour(tours[l.id]) : "—")),
      bestIndex: null,
    },
    {
      label: "Market status",
      values: listings.map((l) => {
        const ms = marketStatuses[l.id];
        if (ms) return marketStatusLabel(ms);
        if (l.status === "removed") return "Off market";
        return "Active";
      }),
      bestIndex: null,
    },
    {
      label: "Your rating",
      values: listings.map((l) => {
        const r = ratings[l.id];
        return r ? "★".repeat(r) + "☆".repeat(5 - r) : "—";
      }),
      bestIndex: bestMax(listings.map((l) => asNum(ratings[l.id]))),
    },
    {
      label: "Your notes",
      values: listings.map((l) => notes[l.id] ?? ""),
      bestIndex: null,
    },
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
                  {l.image_url ? (
                    <a
                      href={l.url ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="compare__thumb"
                      title="Open original listing"
                    >
                      <img
                        src={l.image_url}
                        alt={l.lodging}
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.currentTarget.parentElement as HTMLAnchorElement).style.display = "none";
                        }}
                      />
                    </a>
                  ) : null}
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
