import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Tooltip,
  LayersControl,
  LayerGroup,
  Polyline,
  GeoJSON,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FeatureCollection, Feature } from "geojson";
import { type Listing, type Place } from "../data";
import { type Notes, type Ratings, type Disqualifications, type Tours, type MarketStatuses, statusLabel } from "../userdata";
import { ListingPopup } from "./ListingPopup";

const MPLS_CENTER: [number, number] = [44.93, -93.27];
const QUARTILE_COLORS = ["#2e7d32", "#9ccc65", "#ffb300", "#e53935"];
const ELEM_GEOJSON_URL = `${import.meta.env.BASE_URL}data/mpls-elementary-attendance.geojson`;
const MIDDLE_GEOJSON_URL = `${import.meta.env.BASE_URL}data/mpls-middle-attendance.geojson`;
const HIGH_GEOJSON_URL = `${import.meta.env.BASE_URL}data/mpls-high-attendance.geojson`;

// Deterministic-ish per-school color so each attendance area gets a distinct
// (but muted) fill. We pick from a curated set of soft pastel hues — golden
// ratio hue stepping for max visual separation.
function hashColor(s: string, saturation = 45, lightness = 78): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  const hue = Math.abs(h) % 360;
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

function hashColorDark(s: string): string {
  return hashColor(s, 55, 45);
}

function quartileFor(price: number, breaks: number[]): number {
  for (let i = 0; i < breaks.length; i++) if (price <= breaks[i]) return i;
  return breaks.length;
}

function computeBreaks(prices: number[]): number[] {
  const sorted = [...prices].sort((a, b) => a - b);
  const q = (p: number) => sorted[Math.floor(sorted.length * p)];
  return [q(0.25), q(0.5), q(0.75)];
}

function rentalIcon(color: string, starred: boolean, approximate: boolean): L.DivIcon {
  // Approximate-coord listings render hollow with a dashed border so they're
  // visually distinct from real-address pins.
  const bodyStyle = approximate
    ? `background:rgba(255,255,255,0.85); border-color:${color}; border-width:2px; border-style:dashed;`
    : `background:${color}`;
  const starColor = approximate ? color : "#fff";
  return L.divIcon({
    className: "rental-pin",
    html: `<div class="rental-pin__body" style="${bodyStyle}">
      ${starred ? `<span class="rental-pin__star" style="color:${starColor}">★</span>` : ""}
    </div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

function placeIcon(emoji: string, bg: string): L.DivIcon {
  return L.divIcon({
    className: "place-pin",
    html: `<div class="place-pin__body" style="background:${bg}">${emoji}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

const SCHOOL_ICON = placeIcon("🎓", "#1565c0");
const DAYCARE_ICON = placeIcon("🧸", "#ef6c00");
const WORK_ICON = placeIcon("💼", "#6a1b9a");

function ChainLines({
  selected,
  schools,
  daycares,
}: {
  selected: Listing;
  schools: Place[];
  daycares: Place[];
}) {
  // Don't draw chain lines if the listing's coords are approximate — they'd
  // be misleading.
  if (selected.coords_approximate) return null;
  const home: [number, number] | null = selected.lat != null && selected.lng != null ? [selected.lat, selected.lng] : null;
  const school = schools.find((s) => s.name === selected.school);
  const daycare = daycares.find((d) => d.name === selected.daycare);

  if (!home) return null;

  const segments: { positions: [[number, number], [number, number]]; color: string }[] = [];
  if (school?.lat != null && school?.lng != null) {
    // home → school: school-icon blue, matches the school pin color
    segments.push({ positions: [home, [school.lat, school.lng]], color: "#1565c0" });
  }
  if (daycare?.lat != null && daycare?.lng != null) {
    // home → daycare: daycare-icon orange, matches the daycare pin color
    segments.push({ positions: [home, [daycare.lat, daycare.lng]], color: "#ef6c00" });
  }

  return (
    <>
      {segments.map((s, i) => (
        <Polyline
          key={i}
          positions={s.positions}
          pathOptions={{ color: s.color, weight: 3, opacity: 0.7, dashArray: "6 6" }}
        />
      ))}
    </>
  );
}

// Pixels to shift the map's center NORTH of the pin so the popup (which opens
// above the pin) doesn't run off the top of the viewport. Tuned to fit a popup
// with thumbnail + full details (~360-400px tall).
const POPUP_OFFSET_PX = 180;

function FlyToSelected({
  listing,
  markerRef,
}: {
  listing: Listing | null;
  markerRef: React.RefObject<Map<string, L.Marker>>;
}) {
  const map = useMap();
  useEffect(() => {
    if (!listing || listing.lat == null || listing.lng == null) return;
    const targetZoom = Math.max(map.getZoom(), 14);
    const pinPoint = map.project([listing.lat, listing.lng], targetZoom);
    const centerPoint = L.point(pinPoint.x, pinPoint.y - POPUP_OFFSET_PX);
    const center = map.unproject(centerPoint, targetZoom);
    map.flyTo(center, targetZoom, { duration: 0.7 });
    const marker = markerRef.current?.get(listing.id);
    marker?.openPopup();
  }, [listing, map, markerRef]);
  return null;
}

export function Map({
  listings,
  shortlist,
  schools,
  daycares,
  work,
  selectedId,
  onSelect,
  onToggleStar,
  notes,
  ratings,
  disqualifications,
  tours,
  marketStatuses,
  setNote,
  setRating,
  setDisqualification,
}: {
  listings: Listing[];
  shortlist: Set<string>;
  schools: Place[];
  daycares: Place[];
  work: Place;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onToggleStar: (id: string) => void;
  notes: Notes;
  ratings: Ratings;
  disqualifications: Disqualifications;
  tours: Tours;
  marketStatuses: MarketStatuses;
  setNote: (id: string, text: string) => void;
  setRating: (id: string, rating: number | null) => void;
  setDisqualification: (id: string, reason: string | null) => void;
}) {
  const breaks = useMemo(
    () => computeBreaks(listings.map((l) => l.price ?? 0).filter((p) => p > 0)),
    [listings]
  );

  const markerRef = useRef(new globalThis.Map<string, L.Marker>());
  const selected = listings.find((l) => l.id === selectedId) ?? null;

  // Lazy-load the three attendance GeoJSONs (elem / middle / high) once.
  // ~75KB combined, so just keep them in state.
  const [elemFC, setElemFC] = useState<FeatureCollection | null>(null);
  const [middleFC, setMiddleFC] = useState<FeatureCollection | null>(null);
  const [highFC, setHighFC] = useState<FeatureCollection | null>(null);
  useEffect(() => {
    let cancelled = false;
    const grab = (url: string, set: (j: FeatureCollection) => void) =>
      fetch(url)
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => {
          if (!cancelled && j) set(j as FeatureCollection);
        })
        .catch(() => {});
    grab(ELEM_GEOJSON_URL, setElemFC);
    grab(MIDDLE_GEOJSON_URL, setMiddleFC);
    grab(HIGH_GEOJSON_URL, setHighFC);
    return () => {
      cancelled = true;
    };
  }, []);

  // Elementary: soft pastel fill, thin gray border.
  const elemStyle = (feature?: Feature) => {
    const name = (feature?.properties as { elem_name?: string } | undefined)?.elem_name ?? "";
    return {
      color: "#888",
      weight: 0.8,
      opacity: 0.55,
      fillColor: hashColor(name),
      fillOpacity: 0.2,
    };
  };
  const onEachElem = (feature: Feature, layer: L.Layer) => {
    const name = (feature.properties as { elem_name?: string } | undefined)?.elem_name ?? "Unknown";
    layer.bindTooltip(`Elem: ${name}`, { sticky: true });
  };

  // Middle: muted fill, dashed darker border for visual distinction when
  // stacked with elem.
  const middleStyle = (feature?: Feature) => {
    const name = (feature?.properties as { midd_name?: string } | undefined)?.midd_name ?? "";
    return {
      color: hashColorDark(name),
      weight: 2,
      opacity: 0.85,
      dashArray: "6 4",
      fillColor: hashColor(name),
      fillOpacity: 0.12,
    };
  };
  const onEachMiddle = (feature: Feature, layer: L.Layer) => {
    const name = (feature.properties as { midd_name?: string } | undefined)?.midd_name ?? "Unknown";
    layer.bindTooltip(`Middle: ${name}`, { sticky: true });
  };

  // High: outline-only (no fill) with thick solid border in a dark color
  // sampled from the school name.
  const highStyle = (feature?: Feature) => {
    const name = (feature?.properties as { high_name?: string } | undefined)?.high_name ?? "";
    return {
      color: hashColorDark(name),
      weight: 3,
      opacity: 0.85,
      fillColor: "#000",
      fillOpacity: 0,
    };
  };
  const onEachHigh = (feature: Feature, layer: L.Layer) => {
    const name = (feature.properties as { high_name?: string } | undefined)?.high_name ?? "Unknown";
    layer.bindTooltip(`High: ${name}`, { sticky: true });
  };

  return (
    <MapContainer
      center={MPLS_CENTER}
      zoom={12}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
        maxZoom={20}
        detectRetina
      />
      <FlyToSelected listing={selected} markerRef={markerRef} />
      {selected && selected.lat != null && selected.lng != null ? (
        <ChainLines selected={selected} schools={schools} daycares={daycares} />
      ) : null}
      <LayersControl position="topright">
        <LayersControl.Overlay name="Elem zones">
          <LayerGroup>
            {elemFC ? (
              <GeoJSON data={elemFC} style={elemStyle} onEachFeature={onEachElem} />
            ) : null}
          </LayerGroup>
        </LayersControl.Overlay>

        <LayersControl.Overlay name="Middle zones">
          <LayerGroup>
            {middleFC ? (
              <GeoJSON data={middleFC} style={middleStyle} onEachFeature={onEachMiddle} />
            ) : null}
          </LayerGroup>
        </LayersControl.Overlay>

        <LayersControl.Overlay name="High zones">
          <LayerGroup>
            {highFC ? (
              <GeoJSON data={highFC} style={highStyle} onEachFeature={onEachHigh} />
            ) : null}
          </LayerGroup>
        </LayersControl.Overlay>

        <LayersControl.Overlay checked name="Listings">
          <LayerGroup>
            {listings.map((l) => {
              if (l.lat == null || l.lng == null) return null;
              const q = l.price ? quartileFor(l.price, breaks) : 1;
              const color = l.status === "removed" ? "#9e9e9e" : QUARTILE_COLORS[q];
              const icon = rentalIcon(color, shortlist.has(l.id), !!l.coords_approximate);
              const status = statusLabel(l.id, l.status, tours, marketStatuses, disqualifications, notes);
              const priceStr = l.price ? `$${l.price.toLocaleString()}` : "—";
              return (
                <Marker
                  key={l.id}
                  position={[l.lat, l.lng]}
                  icon={icon}
                  ref={(ref) => {
                    if (ref) markerRef.current.set(l.id, ref);
                    else markerRef.current.delete(l.id);
                  }}
                  eventHandlers={{ click: () => onSelect(l.id) }}
                >
                  <Tooltip direction="top" offset={[0, -12]}>
                    <div className="pin-tooltip">
                      <strong>{l.lodging}</strong>
                      <span className="pin-tooltip__price">{priceStr}/mo · {l.bedrooms ?? "?"}BR</span>
                      {status ? <span className="pin-tooltip__status">{status}</span> : null}
                    </div>
                  </Tooltip>
                  <Popup minWidth={260}>
                    <ListingPopup
                      listing={l}
                      shortlisted={shortlist.has(l.id)}
                      onToggleStar={() => onToggleStar(l.id)}
                      schools={schools}
                      daycares={daycares}
                      note={notes[l.id] ?? ""}
                      rating={ratings[l.id] ?? 0}
                      disqualification={disqualifications[l.id] ?? ""}
                      onNoteChange={(text) => setNote(l.id, text)}
                      onRatingChange={(r) => setRating(l.id, r)}
                      onDisqualificationChange={(reason) => setDisqualification(l.id, reason)}
                    />
                  </Popup>
                </Marker>
              );
            })}
          </LayerGroup>
        </LayersControl.Overlay>

        <LayersControl.Overlay checked name="Schools">
          <LayerGroup>
            {schools.map((s) =>
              s.lat != null && s.lng != null ? (
                <Marker key={s.name} position={[s.lat, s.lng]} icon={SCHOOL_ICON}>
                  <Popup><strong>{s.name}</strong> (school)</Popup>
                </Marker>
              ) : null
            )}
          </LayerGroup>
        </LayersControl.Overlay>

        <LayersControl.Overlay checked name="Daycares">
          <LayerGroup>
            {daycares.map((d) =>
              d.lat != null && d.lng != null ? (
                <Marker key={d.name} position={[d.lat, d.lng]} icon={DAYCARE_ICON}>
                  <Popup><strong>{d.name}</strong> (daycare)</Popup>
                </Marker>
              ) : null
            )}
          </LayerGroup>
        </LayersControl.Overlay>

        <LayersControl.Overlay checked name="Work">
          <LayerGroup>
            {work.lat != null && work.lng != null ? (
              <Marker position={[work.lat, work.lng]} icon={WORK_ICON}>
                <Popup><strong>{work.name}</strong></Popup>
              </Marker>
            ) : null}
          </LayerGroup>
        </LayersControl.Overlay>
      </LayersControl>
    </MapContainer>
  );
}
