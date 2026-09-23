"use client";

import "leaflet/dist/leaflet.css";
import "./DeliveryMap.css";
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip } from "react-leaflet";

const route: [number, number][] = [
  [33.4484, -112.074],
  [34.0489, -111.0937],
  [35.1983, -111.6513],
  [36.1, -109.2],
  [37.2753, -107.8801],
  [39.7392, -104.9903],
];

const pickup = route[0]!;
const stuck = route[3]!;
const destination = route[5]!;

export default function DeliveryMap() {
  return (
    <div className="deliveryMapShell">
      <MapContainer
        center={[36.35, -108.2]}
        zoom={5}
        scrollWheelZoom={false}
        zoomControl={true}
        className="deliveryMap"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Polyline
          positions={route}
          pathOptions={{ color: "#2348d8", weight: 4, dashArray: "9 8" }}
        />
        <CircleMarker
          center={pickup}
          radius={9}
          pathOptions={{ color: "#fff", weight: 3, fillColor: "#39805d", fillOpacity: 1 }}
        >
          <Tooltip permanent direction="top" offset={[0, -10]}>
            PHX / picked up
          </Tooltip>
        </CircleMarker>
        <CircleMarker
          center={stuck}
          radius={10}
          pathOptions={{ color: "#fff", weight: 3, fillColor: "#c15645", fillOpacity: 1 }}
        >
          <Tooltip permanent direction="top" offset={[0, -10]}>
            DURANGO / stuck 48h
          </Tooltip>
        </CircleMarker>
        <CircleMarker
          center={destination}
          radius={9}
          pathOptions={{ color: "#fff", weight: 3, fillColor: "#77736d", fillOpacity: 1 }}
        >
          <Tooltip permanent direction="top" offset={[0, -10]}>
            DEN / destination
          </Tooltip>
        </CircleMarker>
        <div className="deliveryMapOverlay">
          <strong>NS-8821</strong>
          <span>IN TRANSIT / 48H DELAY</span>
          <small>Last scan: Durango, CO</small>
        </div>
      </MapContainer>
    </div>
  );
}
