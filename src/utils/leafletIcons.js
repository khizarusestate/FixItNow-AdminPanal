import L from "leaflet";

let configured = false;

export function createMapMarkerIcon() {
  return L.divIcon({
    className: "fixitnow-map-marker",
    html: `<div style="width:28px;height:28px;display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.35));">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" fill="#ea580c" stroke="#c2410c" stroke-width="0.5">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/>
      </svg>
    </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });
}

export function configureLeafletIcons() {
  if (configured) return;
  configured = true;
  L.Marker.prototype.options.icon = createMapMarkerIcon();
}
