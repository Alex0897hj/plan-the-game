"use client";

import { useEffect, useRef } from "react";
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

  const router      = useRouter();
  const routerRef   = useRef(router);
  const onSelectRef = useRef(onSelect);
  const gamesRef    = useRef(games);
  const selectedRef = useRef(selectedGameId);

  useEffect(() => { routerRef.current   = router; });
  useEffect(() => { onSelectRef.current = onSelect; });
  useEffect(() => { gamesRef.current    = games; });
  useEffect(() => { selectedRef.current = selectedGameId; });

  // Build placemarks and add to clusterer
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

      // Clicking the placemark (not the balloon button) selects the card in the list
      pm.events.add("click", () => {
        onSelectRef.current(game.id);
      });

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

      // Clusterer — cluster click just zooms (default behavior), does NOT select a card
      const clusterer = new ymaps.Clusterer({
        preset:               "islands#redClusterIcons",
        groupByCoordinates:   false,
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
      ymapsRef.current   = null;
      clustererRef.current = null;
      placemarksRef.current.clear();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Rebuild pins when games list changes (e.g. filter applied)
  useEffect(() => {
    if (!ymapsRef.current || !clustererRef.current) return;
    buildPins(ymapsRef.current, games);
  }, [games]); // eslint-disable-line react-hooks/exhaustive-deps

  // React to selection change: update marker presets + center map
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

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
