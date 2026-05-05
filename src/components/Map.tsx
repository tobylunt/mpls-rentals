import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { useMemo } from "react";
import { type Listing } from "../data";

const MPLS_CENTER: [number, number] = [44.93, -93.27];

// 4 colors green → red for cheapest → priciest quartile
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

function pinIcon(color: string, starred: boolean): L.DivIcon {
  return L.divIcon({
    className: "rental-pin",
    html: `
      <div class="rental-pin__body" style="background:${color}">
        ${starred ? '<span class="rental-pin__star">★</span>' : ""}
      </div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

export function Map({
  listings,
  shortlist,
}: {
  listings: Listing[];
  shortlist: Set<string>;
}) {
  const breaks = useMemo(
    () => computeBreaks(listings.map((l) => l.price ?? 0).filter((p) => p > 0)),
    [listings]
  );

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
      {listings.map((l) => {
        if (l.lat == null || l.lng == null) return null;
        const q = l.price ? quartileFor(l.price, breaks) : 1;
        const icon = pinIcon(QUARTILE_COLORS[q], shortlist.has(l.id));
        return (
          <Marker key={l.id} position={[l.lat, l.lng]} icon={icon}>
            <Popup>
              <strong>{l.lodging}</strong>
              <br />
              ${l.price?.toLocaleString()} · {l.bedrooms}BR
              {l.school ? ` · ${l.school}` : ""}
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
