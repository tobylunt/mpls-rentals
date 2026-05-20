import { type Listing, type Place } from "../data";
import { type Notes, type Pros, type Cons, type Ratings, type Tours, type MarketStatuses, type Disqualifications } from "../userdata";
import { chainTimeFor, formatTour, marketStatusLabel } from "./ListingCard";

type Row = {
  label: string;
  values: (string | number | null)[];
  // Indices of cells that tie for "best". null = no highlight.
  best: Set<number> | null;
  // If set, this row's cells render as editable textareas wired to the
  // matching per-listing setter.
  editable?: "notes" | "pros" | "cons";
};

function bestIndices(values: (number | null)[], dir: "min" | "max"): Set<number> | null {
  let best = dir === "min" ? Infinity : -Infinity;
  const out = new Set<number>();
  for (const v of values) {
    if (v == null) continue;
    if (dir === "min" ? v < best : v > best) best = v;
  }
  if (!isFinite(best)) return null;
  values.forEach((v, i) => {
    if (v === best) out.add(i);
  });
  return out.size > 0 ? out : null;
}

function asNum(v: number | null | undefined): number | null {
  return v == null ? null : v;
}

export function CompareView({
  listings,
  schools,
  daycares,
  notes,
  pros,
  cons,
  ratings,
  tours,
  marketStatuses,
  disqualifications,
  setNote,
  setPros,
  setCons,
  onClose,
}: {
  listings: Listing[];
  schools: Place[];
  daycares: Place[];
  notes: Notes;
  pros: Pros;
  cons: Cons;
  ratings: Ratings;
  tours: Tours;
  marketStatuses: MarketStatuses;
  disqualifications: Disqualifications;
  setNote: (id: string, text: string) => void;
  setPros: (id: string, text: string) => void;
  setCons: (id: string, text: string) => void;
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
      best: null,
    },
    {
      label: "Market status",
      values: listings.map((l) => {
        const ms = marketStatuses[l.id];
        if (ms) return marketStatusLabel(ms);
        if (l.status === "removed") return "Off market";
        return "Active";
      }),
      best: null,
    },
    {
      label: "Disqualified",
      values: listings.map((l) => (disqualifications[l.id] ? `👎 ${disqualifications[l.id]}` : "—")),
      best: null,
    },
    {
      label: "Your rating",
      values: listings.map((l) => {
        const r = ratings[l.id];
        return r ? "★".repeat(r) + "☆".repeat(5 - r) : "—";
      }),
      best: bestIndices(listings.map((l) => asNum(ratings[l.id])), "max"),
    },
    {
      label: "Your notes",
      values: listings.map((l) => notes[l.id] ?? ""),
      best: null,
      editable: "notes",
    },
    {
      label: "Pros",
      values: listings.map((l) => pros[l.id] ?? ""),
      best: null,
      editable: "pros",
    },
    {
      label: "Cons",
      values: listings.map((l) => cons[l.id] ?? ""),
      best: null,
      editable: "cons",
    },
    {
      label: "Price",
      values: listings.map((l) => l.price),
      best: bestIndices(listings.map((l) => asNum(l.price)), "min"),
    },
    {
      label: "$ / sqft",
      values: listings.map((l) => l.price_per_sqft),
      best: bestIndices(listings.map((l) => asNum(l.price_per_sqft)), "min"),
    },
    {
      label: "Size (sqft)",
      values: listings.map((l) => l.size_sqft),
      best: bestIndices(listings.map((l) => asNum(l.size_sqft)), "max"),
    },
    {
      label: "Bedrooms",
      values: listings.map((l) => l.bedrooms),
      best: bestIndices(listings.map((l) => asNum(l.bedrooms)), "max"),
    },
    {
      label: "Parking",
      values: listings.map((l) => l.parking),
      best: null,
    },
    {
      label: "School",
      values: listings.map((l) => l.school),
      best: null,
    },
    {
      label: "School drive (min)",
      values: listings.map((l) => l.dist_school.drive_min),
      best: bestIndices(listings.map((l) => l.dist_school.drive_min), "min"),
    },
    {
      label: "Daycare",
      values: listings.map((l) => l.daycare),
      best: null,
    },
    {
      label: "Daycare drive (min)",
      values: listings.map((l) => l.dist_daycare.drive_min),
      best: bestIndices(listings.map((l) => l.dist_daycare.drive_min), "min"),
    },
    {
      label: "Work drive (min)",
      values: listings.map((l) => l.dist_work_drive_min),
      best: bestIndices(listings.map((l) => l.dist_work_drive_min), "min"),
    },
    {
      label: "Chain time (~min)",
      values: chains.map((c) => (c == null ? null : Math.round(c))),
      best: bestIndices(chains.map((c) => (c == null ? null : Math.round(c))), "min"),
    },
    {
      label: "Pet rent",
      values: listings.map((l) => (l.pet_rent === "unknown" ? "?" : l.pet_rent)),
      best: null,
    },
    {
      label: "Furnished",
      values: listings.map((l) => (l.furnished == null ? "—" : l.furnished ? "Yes" : "No")),
      best: null,
    },
    {
      label: "Available",
      values: listings.map((l) => l.available),
      best: null,
    },
    {
      label: "Term",
      values: listings.map((l) => l.term),
      best: null,
    },
    {
      label: "Utilities",
      values: listings.map((l) => l.utilities),
      best: null,
    },
    {
      label: "Notes",
      values: listings.map((l) => l.notes),
      best: null,
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
            {rows.map((r) => {
              const tint =
                r.label === "Pros" ? "compare__row--pros" :
                r.label === "Cons" ? "compare__row--cons" : "";
              const setter =
                r.editable === "notes" ? setNote :
                r.editable === "pros" ? setPros :
                r.editable === "cons" ? setCons : null;
              return (
                <tr key={r.label} className={tint}>
                  <th>{r.label}</th>
                  {r.values.map((v, i) => (
                    <td key={i} className={r.best?.has(i) ? "compare__best" : ""}>
                      {setter ? (
                        <textarea
                          className={`compare__edit compare__edit--${r.editable}`}
                          value={(v ?? "").toString()}
                          placeholder={r.editable === "notes" ? "Notes…" : r.editable === "pros" ? "Pros…" : "Cons…"}
                          onChange={(e) => setter(listings[i].id, e.target.value)}
                          rows={4}
                        />
                      ) : v == null ? "—" : v.toString()}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
