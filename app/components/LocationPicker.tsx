"use client";

/**
 * LocationPicker — interactive Yandex Map for selecting a game location.
 * User clicks anywhere on the map to place/move a marker.
 * Reverse geocoding extracts full address and city automatically.
 * No search, no autocomplete, no Suggest API.
 */

import { useEffect, useRef } from "react";
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
  // Keep onSelect stable inside the async geocode callback
  const onSelectRef  = useRef(onSelect);
  useEffect(() => { onSelectRef.current = onSelect; });

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

      map.events.add("click", async (e: any) => {
        const coords: [number, number] = e.get("coords");

        // Move existing marker or create a new one
        if (placemark) {
          placemark.geometry.setCoordinates(coords);
        } else {
          placemark = new ymaps.Placemark(coords, {}, { preset: "islands#redDotIcon" });
          map.geoObjects.add(placemark);
        }

        // Reverse geocode — extract address and city
        try {
          const result = await ymaps.geocode(coords, { results: 1 });
          if (!active) return;

          const geoObj = result.geoObjects.get(0);
          const address: string = geoObj
            ? geoObj.getAddressLine()
            : `${coords[0].toFixed(6)}, ${coords[1].toFixed(6)}`;

          // getLocalities() returns the city/town name (e.g. "Москва")
          // fall back to first administrative area if locality is unavailable
          const localities: string[]  = geoObj?.getLocalities()         ?? [];
          const adminAreas: string[]  = geoObj?.getAdministrativeAreas() ?? [];
          const city = localities[0] ?? adminAreas[0] ?? "";

          onSelectRef.current({ lat: coords[0], lng: coords[1], address, city });
        } catch {
          // Geocoding failed — still save coordinates with raw fallback address
          if (!active) return;
          const address = `${coords[0].toFixed(6)}, ${coords[1].toFixed(6)}`;
          onSelectRef.current({ lat: coords[0], lng: coords[1], address, city: "" });
        }
      });
    });

    return () => { active = false; };
  }, []); // runs once on mount

  return (
    <div style={{ borderRadius: "10px", overflow: "hidden", border: "1px solid rgba(0,0,0,0.08)" }}>
      <div ref={containerRef} style={{ width: "100%", height }} />
    </div>
  );
}
