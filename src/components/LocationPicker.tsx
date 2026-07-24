import { useState, useEffect, useRef } from "react";
import L from "leaflet";
import { Search, Navigation, MapPin } from "lucide-react";

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

interface LocationPickerProps {
  latitude: number;
  longitude: number;
  onChange: (lat: number, lng: number) => void;
}

export default function LocationPicker({ latitude, longitude, onChange }: LocationPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize leaflet map if it doesn't exist
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current).setView([latitude, longitude], 13);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      const marker = L.marker([latitude, longitude], { 
        icon: defaultIcon,
        draggable: true 
      }).addTo(map);

      // Handle map click
      map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        onChange(lat, lng);
      });

      // Handle marker drag
      marker.on('dragend', (e) => {
        const marker = e.target;
        const position = marker.getLatLng();
        onChange(position.lat, position.lng);
      });

      mapInstanceRef.current = map;
      markerRef.current = marker;
    } else {
      // Update existing map and marker
      mapInstanceRef.current.setView([latitude, longitude]);
      markerRef.current?.setLatLng([latitude, longitude]);
    }

    return () => {
      // Cleanup happens only when component unmounts fully, 
      // but in React 18 strict mode this might run twice.
      // We will keep the instance alive and only destroy on real unmount.
    };
  }, [latitude, longitude]);

  // Handle unmount cleanup
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        onChange(parseFloat(lat), parseFloat(lon));
        setSearchQuery(""); // Clear on success
      } else {
        alert("Location not found. Please try a different address.");
      }
    } catch (e) {
      console.error("Search failed", e);
      alert("Failed to search location.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleLiveLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onChange(position.coords.latitude, position.coords.longitude);
        setIsLocating(false);
      },
      (error) => {
        console.error("Geolocation error:", error);
        alert("Unable to retrieve your location. Please check browser permissions.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true }
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearch())}
            placeholder="Search farm address or village..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-600"
          />
          <button
            type="button"
            onClick={handleSearch}
            disabled={isSearching}
            className="bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center transition-colors shrink-0 disabled:opacity-50"
          >
            {isSearching ? <span className="animate-spin text-lg leading-none mr-1">⟳</span> : <Search className="w-3.5 h-3.5 mr-1" />}
            Search
          </button>
        </div>
        <button
          type="button"
          onClick={handleLiveLocation}
          disabled={isLocating}
          className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-center transition-colors shrink-0 disabled:opacity-50"
        >
          <Navigation className="w-3.5 h-3.5 mr-1" />
          {isLocating ? "Locating..." : "Use Live Location"}
        </button>
      </div>

      <div className="relative w-full h-48 rounded-xl overflow-hidden border border-slate-200 shadow-inner">
        <div ref={mapContainerRef} className="w-full h-full z-0" />
        <div className="absolute top-2 left-2 bg-white/95 backdrop-blur px-2 py-1.5 rounded-lg text-[10px] font-semibold text-slate-700 border border-slate-200 z-10 shadow-sm pointer-events-none flex items-center gap-1">
          <MapPin className="w-3 h-3 text-blue-600" />
          Click or drag marker to set farm location
        </div>
        <div className="absolute bottom-2 right-2 bg-white/95 backdrop-blur px-2 py-1 rounded text-[10px] font-mono font-semibold text-slate-700 border border-slate-200 z-10 shadow-sm pointer-events-none">
          {latitude.toFixed(6)}, {longitude.toFixed(6)}
        </div>
      </div>
    </div>
  );
}
