import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { type Listing } from "../data";

// Fix default-marker icon paths (Leaflet's defaults assume a webpack setup that
// doesn't apply here). Pull from CDN.
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = defaultIcon;

const MPLS_CENTER: [number, number] = [44.93, -93.27];

export function Map({ listings }: { listings: Listing[] }) {
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
      {listings.map((l) =>
        l.lat != null && l.lng != null ? (
          <Marker key={l.id} position={[l.lat, l.lng]}>
            <Popup>
              <strong>{l.lodging}</strong>
              <br />
              ${l.price?.toLocaleString()} · {l.bedrooms}BR
            </Popup>
          </Marker>
        ) : null
      )}
    </MapContainer>
  );
}
