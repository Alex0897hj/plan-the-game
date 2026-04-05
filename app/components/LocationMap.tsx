"use client";

/**
 * LocationMap — read-only Yandex JS API map for the game detail page.
 * Shows a marker at saved coordinates and performs reverse geocoding
 * to display a human-readable address.
 */

import { useEffect, useRef, useState } from "react";
import { loadYmaps } from "@/app/lib/ymaps-loader";

interface Props {
  lat:      number;
  lng:      number;
  address?: string | null;
  height?:  number;
}

export default function LocationMap({ lat, lng, address, height = 280 }: Props) {
  const containerRef      = useRef<HTMLDivElement>(null);
  const inited            = useRef(false);
  const [resolvedAddress, setResolvedAddress] = useState<string>(address ?? "");

  useEffect(() => {
    if (inited.current || !containerRef.current) return;
    inited.current = true;

    const coords: [number, number] = [lat, lng];

    loadYmaps().then(async () => {
      if (!containerRef.current) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ymaps = (window as any).ymaps;

      const map = new ymaps.Map(containerRef.current, {
        center:   coords,
        zoom:     15,
        controls: ["zoomControl"],
      });

      map.geoObjects.add(
        new ymaps.Placemark(coords, {}, { preset: "islands#redDotIcon" }),
      );

      // Reverse geocode to get a fresh human-readable address
      try {
        const result = await ymaps.geocode(coords, { results: 1 });
        const geoObj = result.geoObjects.get(0);
        if (geoObj) setResolvedAddress(geoObj.getAddressLine());
      } catch {
        // keep whatever was passed as prop
      }
    });
  }, []); // coords are stable for a given game

  return (
    <div>
      <div style={addressRowStyle}>
        <PinIcon />
        <span style={{ flex: 1 }}>
          {resolvedAddress || `${lat.toFixed(6)}, ${lng.toFixed(6)}`}
        </span>
      </div>
      <div style={{ borderRadius: "8px", overflow: "hidden", border: "1px solid rgba(0,0,0,0.08)" }}>
        <div ref={containerRef} style={{ width: "100%", height }} />
      </div>
    </div>
  );
}

function PinIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: "2px" }}>
      <path
        d="M8 1.5A4.5 4.5 0 0 0 3.5 6c0 3.5 4.5 8.5 4.5 8.5S12.5 9.5 12.5 6A4.5 4.5 0 0 0 8 1.5Zm0 6a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z"
        fill="currentColor"
      />
    </svg>
  );
}

const addressRowStyle: React.CSSProperties = {
  display:      "flex",
  alignItems:   "flex-start",
  gap:          "6px",
  fontFamily:   "var(--font-ui)",
  fontSize:     "14px",
  color:        "var(--foreground)",
  marginBottom: "10px",
  lineHeight:   "1.4",
};
