import { type Listing, type Place } from "../data";
import { type Itinerary as ItineraryT } from "../userdata";

export type ResolvedStop = {
  // Stable id for visited-state tracking: "listing:<id>" or "school:<name>".
  id: string;
  label: string;
  sub?: string;
  lat: number;
  lng: number;
  note?: string;
};

export function resolveStops(
  itin: ItineraryT,
  listings: Listing[],
  schools: Place[]
): ResolvedStop[] {
  const out: ResolvedStop[] = [];
  for (const s of itin.stops) {
    if (s.kind === "listing") {
      const l = listings.find((x) => x.id === s.id);
      if (l && l.lat != null && l.lng != null) {
        out.push({
          id: `listing:${l.id}`,
          label: l.lodging,
          sub: l.neighborhood ?? undefined,
          lat: l.lat,
          lng: l.lng,
          note: s.note,
        });
      }
    } else if (s.kind === "school") {
      const sch = schools.find((x) => x.name === s.name);
      if (sch && sch.lat != null && sch.lng != null) {
        out.push({
          id: `school:${sch.name}`,
          label: `${sch.name} School`,
          sub: undefined,
          lat: sch.lat,
          lng: sch.lng,
          note: s.note,
        });
      }
    }
  }
  return out;
}

function googleMapsDirURL(stops: ResolvedStop[]): string {
  // https://www.google.com/maps/dir/lat1,lng1/lat2,lng2/... opens a multi-stop
  // route in Google Maps. User can hit "Optimize order" on phone for actual TSP.
  const path = stops.map((s) => `${s.lat},${s.lng}`).join("/");
  return `https://www.google.com/maps/dir/${path}`;
}

export function ItineraryPanel({
  itinerary,
  listings,
  schools,
  visited,
  onFlyTo,
  onToggle,
  onToggleVisited,
}: {
  itinerary: ItineraryT;
  listings: Listing[];
  schools: Place[];
  visited: Set<string>;
  onFlyTo: (lat: number, lng: number) => void;
  onToggle?: (open: boolean) => void;
  onToggleVisited: (stopId: string) => void;
}) {
  const stops = resolveStops(itinerary, listings, schools);
  if (stops.length === 0) return null;
  const doneCount = stops.reduce((n, s) => n + (visited.has(s.id) ? 1 : 0), 0);

  return (
    <details
      className="itinerary"
      onToggle={(e) => onToggle?.(e.currentTarget.open)}
    >
      <summary className="itinerary__summary">
        🚗 {itinerary.label} ({doneCount}/{stops.length})
      </summary>
      <ol className="itinerary__list">
        {stops.map((s, i) => {
          const isDone = visited.has(s.id);
          return (
            <li
              key={s.id}
              className={`itinerary__item ${isDone ? "itinerary__item--done" : ""}`}
              onClick={() => onFlyTo(s.lat, s.lng)}
            >
              <button
                type="button"
                className={`itinerary__num ${isDone ? "itinerary__num--done" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleVisited(s.id);
                }}
                title={isDone ? "Mark as not visited" : "Mark as visited"}
                aria-pressed={isDone}
              >
                {isDone ? "✓" : i + 1}
              </button>
              <span className="itinerary__body">
                <span className="itinerary__label">{s.label}</span>
                {s.sub ? <span className="itinerary__sub">{s.sub}</span> : null}
                {s.note ? <span className="itinerary__note">{s.note}</span> : null}
              </span>
            </li>
          );
        })}
      </ol>
      <a
        className="itinerary__gmaps"
        href={googleMapsDirURL(stops)}
        target="_blank"
        rel="noopener noreferrer"
      >
        Open route in Google Maps →
      </a>
    </details>
  );
}
