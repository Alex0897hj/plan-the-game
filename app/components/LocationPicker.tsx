"use client";

/**
 * LocationPicker — interactive Yandex Map for selecting a game location.
 * User clicks anywhere on the map to place/move a marker.
 * Reverse geocoding extracts full address and city automatically.
 * No search, no autocomplete, no Suggest API.
 */

import { useEffect, useRef, useState } from "react";
import { loadYmaps } from "@/app/lib/ymaps-loader";

export interface PickedLocation {
  lat:     number;
  lng:     number;
  address: string;
  city:    string;
}

interface Props {
  onSelect: (location: PickedLocation) => void;
  height?:  number;
}

// Default center: Moscow
const DEFAULT_CENTER: [number, number] = [55.7558, 37.6173];
const DEFAULT_ZOOM = 10;

export default function LocationPicker({ onSelect, height = 320 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onSelectRef  = useRef(onSelect);
  useEffect(() => { onSelectRef.current = onSelect; });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef   = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const myPinRef = useRef<any>(null);

  const [geoState, setGeoState] = useState<"idle" | "loading" | "error">("idle");
  const [geoError, setGeoError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let placemark: any = null;

    loadYmaps().then(() => {
      if (!active || !containerRef.current) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ymaps = (window as any).ymaps;

      const map = new ymaps.Map(containerRef.current, {
        center:   DEFAULT_CENTER,
        zoom:     DEFAULT_ZOOM,
        controls: ["zoomControl"],
      });
      mapRef.current = map;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      map.events.add("click", async (e: any) => {
        const coords: [number, number] = e.get("coords");

        if (placemark) {
          placemark.geometry.setCoordinates(coords);
        } else {
          placemark = new ymaps.Placemark(coords, {}, { preset: "islands#redDotIcon" });
          map.geoObjects.add(placemark);
        }

        try {
          const result = await ymaps.geocode(coords, { results: 1 });
          if (!active) return;

          const geoObj = result.geoObjects.get(0);
          const address: string = geoObj
            ? geoObj.getAddressLine()
            : `${coords[0].toFixed(6)}, ${coords[1].toFixed(6)}`;

          const localities: string[]  = geoObj?.getLocalities()         ?? [];
          const adminAreas: string[]  = geoObj?.getAdministrativeAreas() ?? [];
          const city = localities[0] ?? adminAreas[0] ?? "";

          onSelectRef.current({ lat: coords[0], lng: coords[1], address, city });
        } catch {
          if (!active) return;
          const address = `${coords[0].toFixed(6)}, ${coords[1].toFixed(6)}`;
          onSelectRef.current({ lat: coords[0], lng: coords[1], address, city: "" });
        }
      });
    });

    return () => {
      active = false;
      mapRef.current  = null;
      myPinRef.current = null;
    };
  }, []); // runs once on mount

  function handleLocate() {
    if (!navigator.geolocation) {
      setGeoError("Геолокация не поддерживается браузером");
      setGeoState("error");
      return;
    }

    setGeoState("loading");
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoState("idle");
        const { latitude: lat, longitude: lng } = pos.coords;
        const map   = mapRef.current;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ymaps = (window as any).ymaps;
        if (!map || !ymaps) return;

        map.setCenter([lat, lng], 15, { duration: 400 });

        if (myPinRef.current) {
          myPinRef.current.geometry.setCoordinates([lat, lng]);
        } else {
          const pin = new ymaps.Placemark(
            [lat, lng],
            { balloonContent: "Вы здесь", hintContent: "Вы здесь" },
            { preset: "islands#blueCircleDotIcon" },
          );
          myPinRef.current = pin;
          map.geoObjects.add(pin);
        }
      },
      (err) => {
        setGeoState("error");
        if (err.code === err.PERMISSION_DENIED) {
          setGeoError("Доступ к геолокации запрещён");
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setGeoError("Не удалось определить местоположение");
        } else {
          setGeoError("Превышено время ожидания геолокации");
        }
      },
      { timeout: 10_000, maximumAge: 60_000 },
    );
  }

  return (
    <div style={{ borderRadius: "10px", overflow: "hidden", border: "1px solid rgba(0,0,0,0.08)", position: "relative" }}>
      <div ref={containerRef} style={{ width: "100%", height }} />

      {/* Locate button */}
      <div style={locateBtnWrapStyle}>
        <button
          type="button"
          onClick={handleLocate}
          disabled={geoState === "loading"}
          style={locateBtnStyle}
          title="Моё местоположение"
        >
          {geoState === "loading" ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ animation: "spin 1s linear infinite" }}>
              <circle cx="8" cy="8" r="6" stroke="#2563eb" strokeWidth="2" strokeDasharray="20 18" strokeLinecap="round"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="3" fill="#2563eb"/>
              <circle cx="8" cy="8" r="6" stroke="#2563eb" strokeWidth="1.5"/>
              <path d="M8 1v2M8 13v2M1 8h2M13 8h2" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          )}
          {geoState === "loading" ? "Определяем…" : "Я здесь"}
        </button>

        {geoState === "error" && geoError && (
          <div style={geoErrorStyle}>
            {geoError}
            <button type="button" onClick={() => setGeoState("idle")} style={geoErrorCloseStyle}>✕</button>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* ── Styles ── */

const locateBtnWrapStyle: React.CSSProperties = {
  position:      "absolute",
  bottom:        "60px",
  left:          "16px",
  display:       "flex",
  flexDirection: "column",
  alignItems:    "flex-start",
  gap:           "8px",
  zIndex:        10,
};

const locateBtnStyle: React.CSSProperties = {
  display:      "inline-flex",
  alignItems:   "center",
  gap:          "7px",
  padding:      "8px 14px",
  borderRadius: "10px",
  border:       "none",
  background:   "#ffffff",
  boxShadow:    "0 2px 8px rgba(0,0,0,0.18)",
  fontFamily:   "var(--font-ui)",
  fontSize:     "13px",
  fontWeight:   600,
  color:        "#2563eb",
  cursor:       "pointer",
  transition:   "box-shadow 0.15s",
};

const geoErrorStyle: React.CSSProperties = {
  display:      "flex",
  alignItems:   "center",
  gap:          "8px",
  padding:      "8px 12px",
  borderRadius: "10px",
  background:   "#ffffff",
  boxShadow:    "0 2px 8px rgba(0,0,0,0.18)",
  fontFamily:   "var(--font-ui)",
  fontSize:     "12px",
  color:        "#dc2626",
  maxWidth:     "220px",
};

const geoErrorCloseStyle: React.CSSProperties = {
  background: "none",
  border:     "none",
  cursor:     "pointer",
  color:      "#9ca3af",
  fontSize:   "12px",
  padding:    "0",
  flexShrink: 0,
};
