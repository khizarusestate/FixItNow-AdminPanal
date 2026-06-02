import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Navigation, Loader2, Map } from "lucide-react";
import { configureLeafletIcons, createMapMarkerIcon } from "../utils/leafletIcons.js";
import { reverseGeocode, searchPlaces } from "../utils/geocoding.js";

const DEFAULT_CENTER = { lat: 32.1877, lng: 74.1945 };
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

configureLeafletIcons();

export default function LocationPicker({
  value = {},
  onChange,
  label = "Location",
  required = false,
  disabled = false,
  className = "",
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const searchTimerRef = useRef(null);

  const [pickerMode, setPickerMode] = useState("idle");
  const [mapReady, setMapReady] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [locating, setLocating] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState(value.location || "");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const lat = value.latitude ?? null;
  const lng = value.longitude ?? null;
  const hasCoords =
    typeof lat === "number" &&
    !Number.isNaN(lat) &&
    typeof lng === "number" &&
    !Number.isNaN(lng);

  useEffect(() => {
    if (hasCoords || value.location) {
      setPickerMode("active");
    }
  }, [hasCoords, value.location]);

  const setLocation = useCallback(
    (next) => {
      onChange?.({
        location: next.location ?? "",
        latitude: next.latitude ?? null,
        longitude: next.longitude ?? null,
        placeId: next.placeId ?? "",
      });
      if (next.location != null) setSearchQuery(next.location);
    },
    [onChange],
  );

  const applyCoords = useCallback(
    async (latitude, longitude, fallbackLabel = null) => {
      try {
        const data = await reverseGeocode(latitude, longitude);
        setLocation({
          location: data.location || fallbackLabel || "",
          latitude: data.latitude ?? latitude,
          longitude: data.longitude ?? longitude,
          placeId: data.placeId || "",
        });
      } catch {
        const labelText =
          fallbackLabel ||
          `${Number(latitude).toFixed(6)}, ${Number(longitude).toFixed(6)}`;
        setLocation({
          location: labelText,
          latitude,
          longitude,
          placeId: "",
        });
      }
    },
    [setLocation],
  );

  const placeMarker = useCallback(
    (latitude, longitude, pan = true) => {
      const map = mapRef.current;
      if (!map) return;
      const latLng = L.latLng(latitude, longitude);
      if (markerRef.current) {
        markerRef.current.setLatLng(latLng);
      } else {
        markerRef.current = L.marker(latLng, {
          draggable: !disabled,
          icon: createMapMarkerIcon(),
        }).addTo(map);
        markerRef.current.on("dragend", () => {
          const pos = markerRef.current.getLatLng();
          applyCoords(pos.lat, pos.lng);
        });
      }
      if (pan) map.setView(latLng, Math.max(map.getZoom(), 15), { animate: true });
    },
    [applyCoords, disabled],
  );

  useEffect(() => {
    if (pickerMode !== "active" || !mapContainerRef.current || mapRef.current) return;

    const center = hasCoords
      ? L.latLng(lat, lng)
      : L.latLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng);

    const map = L.map(mapContainerRef.current, {
      center,
      zoom: hasCoords ? 15 : 12,
      scrollWheelZoom: !disabled,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: OSM_ATTRIBUTION,
      maxZoom: 19,
    }).addTo(map);

    map.on("click", (e) => {
      if (disabled) return;
      placeMarker(e.latlng.lat, e.latlng.lng, false);
      applyCoords(e.latlng.lat, e.latlng.lng);
    });

    mapRef.current = map;
    if (hasCoords) placeMarker(lat, lng, false);
    setMapReady(true);

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      setMapReady(false);
    };
  }, [pickerMode, applyCoords, disabled, hasCoords, lat, lng, placeMarker]);

  useEffect(() => {
    if (!mapReady || !hasCoords) return;
    placeMarker(lat, lng, true);
  }, [lat, lng, mapReady, hasCoords, placeMarker]);

  useEffect(() => {
    setSearchQuery(value.location || "");
  }, [value.location]);

  const runSearch = (query) => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      return;
    }
    searchTimerRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchPlaces(trimmed);
        setSuggestions(results);
        setShowSuggestions(true);
      } catch (err) {
        setLoadError(err.message || "Search failed.");
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 450);
  };

  const selectSuggestion = (item) => {
    setShowSuggestions(false);
    setSuggestions([]);
    setLocation({
      location: item.location,
      latitude: item.latitude,
      longitude: item.longitude,
      placeId: item.placeId || "",
    });
    if (mapRef.current) {
      placeMarker(item.latitude, item.longitude, true);
    }
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setLoadError("Geolocation is not supported on this device.");
      return;
    }
    setLocating(true);
    setLoadError("");
    setPickerMode("active");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const tryPlace = () => {
          if (mapRef.current) {
            placeMarker(latitude, longitude, true);
            applyCoords(latitude, longitude).finally(() => setLocating(false));
          } else {
            setTimeout(tryPlace, 100);
          }
        };
        tryPlace();
      },
      () => {
        setLoadError("Could not access your location. Allow permission and try again.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  const openMapMode = () => {
    setPickerMode("active");
    setLoadError("");
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <label className="block text-sm font-medium text-slate-700">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </label>

      {pickerMode === "idle" && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => setPickerMode("choosing")}
          className="w-full rounded-xl border-2 border-dashed border-orange-300 bg-orange-50 px-4 py-4 text-sm font-semibold text-orange-700 hover:bg-orange-100 disabled:opacity-50"
        >
          <MapPin size={18} className="inline mr-2 -mt-0.5" />
          Select Location
        </button>
      )}

      {pickerMode === "choosing" && (
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            disabled={disabled || locating}
            onClick={handleUseMyLocation}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:border-orange-400 hover:bg-orange-50 disabled:opacity-50"
          >
            {locating ? (
              <Loader2 size={18} className="animate-spin text-orange-500" />
            ) : (
              <Navigation size={18} className="text-orange-500" />
            )}
            Use Current Location
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={openMapMode}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:border-orange-400 hover:bg-orange-50 disabled:opacity-50"
          >
            <Map size={18} className="text-orange-500" />
            Pick on Map
          </button>
        </div>
      )}

      {pickerMode === "active" && (
        <>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <MapPin
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10"
              />
              <input
                type="text"
                value={searchQuery}
                disabled={disabled}
                placeholder="Search address or tap the map"
                className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-3 text-sm focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none disabled:bg-slate-100"
                onChange={(e) => {
                  const v = e.target.value;
                  setSearchQuery(v);
                  setLocation({ ...value, location: v });
                  runSearch(v);
                }}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              />
              {searching && (
                <Loader2
                  size={16}
                  className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400"
                />
              )}
              {showSuggestions && suggestions.length > 0 && (
                <ul className="absolute z-20 mt-1 w-full max-h-48 overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg text-sm">
                  {suggestions.map((item, idx) => (
                    <li key={`${item.placeId}-${idx}`}>
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left hover:bg-orange-50 text-slate-700"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => selectSuggestion(item)}
                      >
                        {item.location}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button
              type="button"
              disabled={disabled || locating}
              onClick={handleUseMyLocation}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              title="Use my current location"
            >
              {locating ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Navigation size={16} />
              )}
              <span className="hidden sm:inline">GPS</span>
            </button>
          </div>

          <div
            ref={mapContainerRef}
            className="h-56 w-full rounded-xl border border-slate-200 bg-slate-100 overflow-hidden z-0"
          />

          {loadError ? (
            <p className="text-sm text-red-600">{loadError}</p>
          ) : null}
        </>
      )}
    </div>
  );
}
