"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { getAccessToken } from "@/app/lib/auth-api";

interface Game {
  id:             number;
  title:          string;
  city:           string;
  gameDateTime:   string;
  minPlayers:     number;
  status:         "upcoming" | "cancelled" | "completed";
  createdBy:      { id: number; email: string; name: string | null };
  confirmedCount: number;
  thinkingCount:  number;
  latitude:       number | null;
  longitude:      number | null;
}

const STATIC_MAP_KEY = "7ae6ca34-545f-4776-a78b-b5fa4c11d71f";

function staticMapUrl(lat: number, lng: number): string {
  const ll = `${lng},${lat}`;   // Static API: longitude first, then latitude
  const pt = `${lng},${lat},pm2rdm`;
  return (
    `https://static-maps.yandex.ru/v1` +
    `?apikey=${STATIC_MAP_KEY}` +
    `&ll=${ll}` +
    `&z=14` +
    `&size=600,140` +
    `&pt=${pt}` +
    `&lang=ru_RU`
  );
}

export default function Home() {
  const [games,   setGames]   = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGames = useCallback(async () => {
    const token   = getAccessToken();
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await fetch("/api/games", { headers });
    if (res.ok) setGames(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchGames();
    window.addEventListener("authchange", fetchGames);
    return () => window.removeEventListener("authchange", fetchGames);
  }, [fetchGames]);

  if (loading) {
    return (
      <main style={pageStyle}>
        <p style={mutedText}>Загрузка…</p>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <div style={innerStyle}>
        <h1 style={headingStyle}>Игры</h1>

        {games.length === 0 ? (
          <p style={mutedText}>Пока нет ни одной игры. Создайте первую!</p>
        ) : (
          <div style={gridStyle}>
            {games.map((game) => <GameCard key={game.id} game={game} />)}
          </div>
        )}
      </div>
    </main>
  );
}

/* ─── Game Card ──────────────────────────────────────────── */

function GameCard({ game }: { game: Game }) {
  const dateStr = new Date(game.gameDateTime).toLocaleString("ru-RU", {
    day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  const statusColors: Record<Game["status"], { bg: string; color: string; label: string }> = {
    upcoming:  { bg: "#eff6ff", color: "#2563eb", label: "Скоро"     },
    completed: { bg: "#f0fdf4", color: "#16a34a", label: "Завершена" },
    cancelled: { bg: "#fef2f2", color: "#dc2626", label: "Отменена"  },
  };
  const badge = statusColors[game.status];

  const hasMap = game.latitude != null && game.longitude != null;

  return (
    <Link href={`/games/${game.id}`} style={cardStyle}>

      {/* Static map preview */}
      {hasMap && (
        <div style={mapPreviewWrapStyle}>
          <img
            src={staticMapUrl(game.latitude!, game.longitude!)}
            alt="Карта"
            style={mapPreviewImgStyle}
          />
        </div>
      )}

      {/* Card body */}
      <div style={cardBodyStyle}>

      {/* City + badge */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginBottom: "10px" }}>
        <span style={cityStyle}>
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
            <path d="M8 1.5A4.5 4.5 0 0 0 3.5 6c0 3.5 4.5 8.5 4.5 8.5S12.5 9.5 12.5 6A4.5 4.5 0 0 0 8 1.5Zm0 6a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z" fill="currentColor"/>
          </svg>
          {game.city}
        </span>
        <span style={{ ...badgeBase, background: badge.bg, color: badge.color }}>
          {badge.label}
        </span>
      </div>

      {/* Title */}
      <h2 style={titleStyle}>{game.title}</h2>

      {/* Date */}
      <p style={metaStyle}>
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: "1px" }}>
          <rect x="1.5" y="2.5" width="13" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
          <path d="M5 1v3M11 1v3M1.5 6.5h13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
        {dateStr}
      </p>

      {/* Stats */}
      <div style={statsRowStyle}>
        <span style={statChipStyle}>
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
            <circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M1.5 13c0-2.485 2.015-4.5 4.5-4.5s4.5 2.015 4.5 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            <circle cx="11.5" cy="5" r="2" stroke="currentColor" strokeWidth="1.2"/>
            <path d="M14.5 13c0-2-1.343-3.678-3.2-4.3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          Участвуют: <strong>{game.confirmedCount}/{game.minPlayers}</strong>
        </span>
        {game.thinkingCount > 0 && (
          <span style={{ ...statChipStyle, background: "#fffbeb", color: "#b45309" }}>
            Думают: <strong>{game.thinkingCount}</strong>
          </span>
        )}
      </div>

      {/* Creator */}
      <p style={creatorStyle}>
        Организатор: {game.createdBy.name ?? game.createdBy.email}
      </p>

      </div>{/* end card body */}
    </Link>
  );
}

/* ─── Styles ──────────────────────────────────────────────── */

const pageStyle: React.CSSProperties = {
  flex: 1, background: "var(--surface)", padding: "40px 24px",
};

const innerStyle: React.CSSProperties = {
  maxWidth: "960px", margin: "0 auto",
};

const headingStyle: React.CSSProperties = {
  fontFamily: "var(--font-ui)", fontWeight: 800, fontSize: "26px",
  letterSpacing: "-0.4px", color: "var(--foreground)", margin: "0 0 24px",
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
  gap: "16px",
};

const cardStyle: React.CSSProperties = {
  background: "#ffffff", borderRadius: "var(--radius-lg)",
  boxShadow: "var(--shadow-drop)",
  display: "flex", flexDirection: "column",
  textDecoration: "none", color: "inherit",
  transition: "box-shadow 0.15s, transform 0.15s",
  cursor: "pointer",
  overflow: "hidden",
};

const cityStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: "4px",
  fontFamily: "var(--font-ui)", fontSize: "13px", fontWeight: 600, color: "var(--muted)",
};

const badgeBase: React.CSSProperties = {
  padding: "3px 8px", borderRadius: "100px",
  fontSize: "12px", fontWeight: 600, fontFamily: "var(--font-ui)",
};

const titleStyle: React.CSSProperties = {
  fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: "17px",
  letterSpacing: "-0.2px", color: "var(--foreground)", margin: "0 0 8px",
};

const metaStyle: React.CSSProperties = {
  display: "flex", alignItems: "flex-start", gap: "5px",
  fontFamily: "var(--font-ui)", fontSize: "13px", color: "var(--muted)", margin: "0 0 12px",
};

const statsRowStyle: React.CSSProperties = {
  display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "10px",
};

const statChipStyle: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: "4px",
  padding: "4px 10px", borderRadius: "100px",
  background: "#eff6ff", color: "#2563eb",
  fontFamily: "var(--font-ui)", fontSize: "13px",
};

const creatorStyle: React.CSSProperties = {
  fontFamily: "var(--font-ui)", fontSize: "13px", color: "var(--muted)", margin: "auto 0 0",
  paddingTop: "8px",
};

const mutedText: React.CSSProperties = {
  fontFamily: "var(--font-ui)", fontSize: "15px", color: "var(--muted)",
};

const mapPreviewWrapStyle: React.CSSProperties = {
  width: "100%", height: "140px", overflow: "hidden", flexShrink: 0,
};

const mapPreviewImgStyle: React.CSSProperties = {
  width: "100%", height: "100%", objectFit: "cover", display: "block",
};

const cardBodyStyle: React.CSSProperties = {
  padding: "16px 20px 20px", display: "flex", flexDirection: "column", flex: 1,
};
