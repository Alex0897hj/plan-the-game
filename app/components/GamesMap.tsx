"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { loadYmaps } from "@/app/lib/ymaps-loader";

interface GamePin {
  id:             number;
  title:          string;
  city:           string;
  gameDateTime:   string;
  confirmedCount: number;
  minPlayers:     number;
  lat:            number;
  lng:            number;
}

interface Props {
  games:   GamePin[];
  onClose: () => void;
}

export default function GamesMap({ games, onClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const router       = useRouter();
  const routerRef    = useRef(router);
  useEffect(() => { routerRef.current = router; });

  useEffect(() => {
    if (!containerRef.current) return;
    let active = true;

    loadYmaps().then(() => {
      if (!active || !containerRef.current) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ymaps = (window as any).ymaps;

      const centerLat = games.length
        ? games.reduce((s, g) => s + g.lat, 0) / games.length
        : 55.7558;
      const centerLng = games.length
        ? games.reduce((s, g) => s + g.lng, 0) / games.length
        : 37.6173;

      const map = new ymaps.Map(containerRef.current, {
        center:   [centerLat, centerLng],
        zoom:     games.length === 1 ? 14 : 10,
        controls: ["zoomControl", "fullscreenControl"],
      });

      games.forEach((game) => {
        const dateStr = new Date(game.gameDateTime).toLocaleString("ru-RU", {
          day: "numeric", month: "long",
          hour: "2-digit", minute: "2-digit",
        });

        const placemark = new ymaps.Placemark(
          [game.lat, game.lng],
          {
            balloonContentHeader: game.title,
            balloonContentBody:
              `<div style="font-family:sans-serif;font-size:13px;line-height:1.5">` +
              `<div>📍 ${game.city}</div>` +
              `<div>🕐 ${dateStr}</div>` +
              `<div>👥 ${game.confirmedCount}/${game.minPlayers}</div>` +
              `<button onclick="window.__gamesMapNav('${game.id}')" ` +
              `style="margin-top:8px;padding:6px 14px;background:#2563eb;color:#fff;` +
              `border:none;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600">` +
              `Открыть игру →</button>` +
              `</div>`,
            hintContent: game.title,
          },
          { preset: "islands#redDotIcon" },
        );

        map.geoObjects.add(placemark);
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__gamesMapNav = (id: string) => {
        routerRef.current.push(`/games/${id}`);
      };
    });

    return () => {
      active = false;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any).__gamesMapNav;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>

        <div style={headerStyle}>
          <span style={headerTitleStyle}>Игры на карте</span>
          <button onClick={onClose} style={closeBtnStyle} aria-label="Закрыть">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M2 2l14 14M16 2L2 16" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div ref={containerRef} style={{ flex: 1, minHeight: 0 }} />

      </div>
    </div>
  );
}

/* ─── Styles ─────────────────────────────────────────────── */

const overlayStyle: React.CSSProperties = {
  position:       "fixed",
  inset:          0,
  background:     "rgba(0,0,0,0.5)",
  zIndex:         400,
  display:        "flex",
  alignItems:     "center",
  justifyContent: "center",
  padding:        "24px",
};

const modalStyle: React.CSSProperties = {
  width:         "100%",
  maxWidth:      "960px",
  height:        "80vh",
  background:    "#ffffff",
  borderRadius:  "var(--radius-lg, 12px)",
  boxShadow:     "0 8px 40px rgba(0,0,0,0.2)",
  display:       "flex",
  flexDirection: "column",
  overflow:      "hidden",
};

const headerStyle: React.CSSProperties = {
  display:        "flex",
  alignItems:     "center",
  justifyContent: "space-between",
  padding:        "14px 20px",
  borderBottom:   "1px solid rgba(0,0,0,0.07)",
  flexShrink:     0,
};

const headerTitleStyle: React.CSSProperties = {
  fontFamily:    "var(--font-ui)",
  fontWeight:    700,
  fontSize:      "16px",
  color:         "var(--foreground)",
  letterSpacing: "-0.2px",
};

const closeBtnStyle: React.CSSProperties = {
  background:   "none",
  border:       "none",
  cursor:       "pointer",
  color:        "var(--muted)",
  padding:      "4px",
  display:      "flex",
  alignItems:   "center",
  borderRadius: "6px",
};
