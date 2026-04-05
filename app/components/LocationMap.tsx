"use client";

/**
 * LocationMap — read-only Yandex Map showing a single saved marker.
 * Used on the game details page to display where the game will be held.
 * No interaction, no search, no controls except zoom.
 */

import { useEffect, useRef } from "react";
import { loadYmaps } from "@/app/lib/ymaps-loader";

interface Props {
  lat:      number;
  lng:      number;
  address?: string | null;
  height?:  number;
}

export default function LocationMap({ lat, lng, address, height = 280 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inited       = useRef(false);

  useEffect(() => {
    if (inited.current || !containerRef.current) return;
    inited.current = true;

    const coords: [number, number] = [lat, lng];

    loadYmaps().then(() => {
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
    });
  }, []); // lat/lng are stable for a given game — run once on mount

  return (
    <div>
      {address && (
        <div style={addressRowStyle}>
          <PinIcon />
          <span>{address}</span>
        </div>
      )}
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
  display:    "flex",
  alignItems: "flex-start",
  gap:        "6px",
  fontFamily: "var(--font-ui)",
  fontSize:   "14px",
  color:      "var(--foreground)",
  marginBottom: "10px",
};
