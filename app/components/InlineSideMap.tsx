"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { loadYmaps } from "@/app/lib/ymaps-loader";

type GameType = "five_x_five" | "seven_x_seven" | "eight_x_eight";

const GAME_TYPE_LABEL: Record<GameType, string> = {
  five_x_five:   "5×5",
  seven_x_seven: "7×7",
  eight_x_eight: "8×8",
};

export interface GamePin {
  id:             number;
  title:          string;
  city:           string;
  gameDateTime:   string;
  gameType:       GameType;
  confirmedCount: number;
  minPlayers:     number;
  lat:            number;
  lng:            number;
}

interface Props {
  games:          GamePin[];
  selectedGameId: number | null;
  onSelect:       (id: number) => void;
}

const PRESET_NORMAL   = "islands#redDotIcon";
const PRESET_SELECTED = "islands#redIcon";

export default function InlineSideMap({ games, selectedGameId, onSelect }: Props) {
  const containerRef  = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef        = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ymapsRef      = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clustererRef  = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const placemarksRef = useRef<Map<number, any>>(new Map());
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const myPinRef      = useRef<any>(null);

  const [geoState, setGeoState] = useState<"idle" | "loading" | "error">("idle");
  const [geoError, setGeoError] = useState<string | null>(null);

  const router      = useRouter();
  const routerRef   = useRef(router);
  const onSelectRef = useRef(onSelect);
  const gamesRef    = useRef(games);
  const selectedRef = useRef(selectedGameId);

  useEffect(() => { routerRef.current   = router; });
  useEffect(() => { onSelectRef.current = onSelect; });
  useEffect(() => { gamesRef.current    = games; });
  useEffect(() => { selectedRef.current = selectedGameId; });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function buildPins(ymaps: any, pinGames: GamePin[]) {
    if (!clustererRef.current) return;
    clustererRef.current.removeAll();
    placemarksRef.current.clear();

    const marks = pinGames.map((game) => {
      const dateStr = new Date(game.gameDateTime).toLocaleString("ru-RU", {
        day: "numeric", month: "long",
        hour: "2-digit", minute: "2-digit",
      });

      const pm = new ymaps.Placemark(
        [game.lat, game.lng],
        {
          balloonContentHeader: game.title,
          balloonContentBody:
            `<div style="font-family:sans-serif;font-size:13px;line-height:1.6">` +
            `<div>📍 ${game.city}</div>` +
            `<div>🕐 ${dateStr}</div>` +
            `<div>⚽ ${GAME_TYPE_LABEL[game.gameType]} · 👥 ${game.confirmedCount}/${game.minPlayers}</div>` +
            `<button onclick="window.__inlineMapNav('${game.id}')" ` +
            `style="margin-top:8px;padding:6px 14px;background:#2563eb;color:#fff;` +
            `border:none;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600">` +
            `Открыть →</button>` +
            `</div>`,
          hintContent: game.title,
        },
        { preset: game.id === selectedRef.current ? PRESET_SELECTED : PRESET_NORMAL },
      );

      pm.events.add("click", () => { onSelectRef.current(game.id); });
      placemarksRef.current.set(game.id, pm);
      return pm;
    });

    clustererRef.current.add(marks);
  }

  // Init map once
  useEffect(() => {
    if (!containerRef.current) return;
    let active = true;

    loadYmaps().then(() => {
      if (!active || !containerRef.current) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ymaps = (window as any).ymaps;
      ymapsRef.current = ymaps;

      const g         = gamesRef.current;
      const centerLat = g.length ? g.reduce((s, x) => s + x.lat, 0) / g.length : 55.7558;
      const centerLng = g.length ? g.reduce((s, x) => s + x.lng, 0) / g.length : 37.6173;

      const map = new ymaps.Map(containerRef.current, {
        center:   [centerLat, centerLng],
        zoom:     g.length === 1 ? 14 : 10,
        controls: ["zoomControl", "fullscreenControl"],
      });
      mapRef.current = map;

      const clusterer = new ymaps.Clusterer({
        preset:                  "islands#redClusterIcons",
        groupByCoordinates:      false,
        clusterDisableClickZoom: false,
      });
      clustererRef.current = clusterer;
      map.geoObjects.add(clusterer);

      buildPins(ymaps, gamesRef.current);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__inlineMapNav = (id: string) => routerRef.current?.push(`/games/${id}`);
    });

    return () => {
      active = false;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any).__inlineMapNav;
      if (mapRef.current) {
        try { mapRef.current.destroy(); } catch { /* ignore */ }
        mapRef.current = null;
      }
      ymapsRef.current    = null;
      clustererRef.current = null;
      placemarksRef.current.clear();
      myPinRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Rebuild pins on filter change
  useEffect(() => {
    if (!ymapsRef.current || !clustererRef.current) return;
    buildPins(ymapsRef.current, games);
  }, [games]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync selection → marker + map center
  useEffect(() => {
    if (!mapRef.current) return;

    placemarksRef.current.forEach((pm, id) => {
      pm.options.set("preset", id === selectedGameId ? PRESET_SELECTED : PRESET_NORMAL);
    });

    if (selectedGameId !== null) {
      const game = games.find((g) => g.id === selectedGameId);
      if (game) {
        mapRef.current.setCenter([game.lat, game.lng], 15, { duration: 300 });
      }
    }
  }, [selectedGameId]); // eslint-disable-line react-hooks/exhaustive-deps

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
        const ymaps = ymapsRef.current;
        if (!map || !ymaps) return;

        map.setCenter([lat, lng], 15, { duration: 400 });

        // Reuse existing "you are here" pin
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
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

      {/* Locate button */}
      <div style={locateBtnWrapStyle}>
        <button
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
            <button onClick={() => setGeoState("idle")} style={geoErrorCloseStyle}>✕</button>
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
