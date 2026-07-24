import { useEffect, useRef } from "react";
import L from "leaflet";

// Leaflet assets need configuration to load icons correctly in some bundlers
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41],
});

interface MapComponentProps {
  latitude: number;
  longitude: number;
  cropType: string;
  damageType: string;
  farmerName: string;
}

export default function MapComponent({
  latitude,
  longitude,
  cropType,
  damageType,
  farmerName,
}: MapComponentProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize leaflet map
    const map = L.map(mapContainerRef.current, {
      center: [latitude, longitude],
      zoom: 12,
      zoomControl: true,
      layers: [
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }),
      ],
    });

    mapInstanceRef.current = map;

    // Add marker
    const marker = L.marker([latitude, longitude], { icon: defaultIcon })
      .addTo(map)
      .bindPopup(
        `<div class="text-xs font-sans">
          <p class="font-bold text-emerald-700">${cropType} Claim</p>
          <p class="text-gray-600">Farmer: ${farmerName}</p>
          <p class="text-red-500 font-medium">Damage: ${damageType}</p>
          <p class="text-gray-400 font-mono mt-1">${latitude.toFixed(4)}, ${longitude.toFixed(4)}</p>
        </div>`
      )
      .openPopup();

    // Cleanup map on unmount
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [latitude, longitude, cropType, damageType, farmerName]);

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden border border-slate-200 shadow-inner">
      <div ref={mapContainerRef} className="w-full h-full z-0" style={{ minHeight: "280px" }} />
      <div className="absolute bottom-2 right-2 bg-white/95 backdrop-blur px-2 py-1 rounded text-[10px] font-mono font-semibold text-slate-700 border border-slate-200 z-10 shadow-sm">
        GPS: {latitude.toFixed(6)}, {longitude.toFixed(6)}
      </div>
    </div>
  );
}
