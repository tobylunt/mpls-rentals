import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  LayersControl,
  LayerGroup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { useEffect, useMemo, useRef } from "react";
import { type Listing, type Place } from "../data";

const MPLS_CENTER: [number, number] = [44.93, -93.27];
const QUARTILE_COLORS = ["#2e7d32", "#9ccc65", "#ffb300", "#e53935"];

function quartileFor(price: number, breaks: number[]): number {
  for (let i = 0; i < breaks.length; i++) if (price <= breaks[i]) return i;
  return breaks.length;
}

function computeBreaks(prices: number[]): number[] {
  const sorted = [...prices].sort((a, b) => a - b);
  const q = (p: number) => sorted[Math.floor(sorted.length * p)];
  return [q(0.25), q(0.5), q(0.75)];
}

function rentalIcon(color: string, starred: boolean): L.DivIcon {
  return L.divIcon({
    className: "rental-pin",
    html: `<div class="rental-pin__body" style="background:${color}">
      ${starred ? '<span class="rental-pin__star">★</span>' : ""}
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
    map.flyTo([listing.lat, listing.lng], Math.max(map.getZoom(), 14), { duration: 0.7 });
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
}: {
  listings: Listing[];
  shortlist: Set<string>;
  schools: Place[];
  daycares: Place[];
  work: Place;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const breaks = useMemo(
    () => computeBreaks(listings.map((l) => l.price ?? 0).filter((p) => p > 0)),
    [listings]
  );

  const markerRef = useRef(new globalThis.Map<string, L.Marker>());
  const selected = listings.find((l) => l.id === selectedId) ?? null;

  return (
    <MapContainer
      center={MPLS_CENTER}
      zoom={12}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FlyToSelected listing={selected} markerRef={markerRef} />
      <LayersControl position="topright">
        <LayersControl.Overlay checked name="Listings">
          <LayerGroup>
            {listings.map((l) => {
              if (l.lat == null || l.lng == null) return null;
              const q = l.price ? quartileFor(l.price, breaks) : 1;
              const icon = rentalIcon(QUARTILE_COLORS[q], shortlist.has(l.id));
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
                  <Popup>
                    <strong>{l.lodging}</strong>
                    <br />
                    ${l.price?.toLocaleString()} · {l.bedrooms}BR
                    {l.school ? ` · ${l.school}` : ""}
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
