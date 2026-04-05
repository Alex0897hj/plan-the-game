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
  games: GamePin[];
}

export default function GamesMap({ games }: Props) {
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

  return (
    <div
      ref={containerRef}
      style={{
        width:        "100%",
        height:       "560px",
        borderRadius: "var(--radius-lg)",
        overflow:     "hidden",
        boxShadow:    "var(--shadow-drop)",
      }}
    />
  );
}
