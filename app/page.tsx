"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { getAccessToken } from "@/app/lib/auth-api";
import GamesMap from "@/app/components/GamesMap";

const RUSSIAN_CITIES = [
  "Москва", "Санкт-Петербург",
  "Астрахань",
  "Балашиха", "Барнаул", "Белгород", "Брянск",
  "Владивосток", "Владимир", "Волгоград", "Воронеж",
  "Грозный",
  "Екатеринбург",
  "Иваново", "Ижевск", "Иркутск",
  "Казань", "Калининград", "Кемерово", "Киров", "Краснодар", "Красноярск", "Курск",
  "Липецк",
  "Магнитогорск", "Махачкала", "Мурманск",
  "Набережные Челны", "Нижний Новгород", "Нижний Тагил", "Новокузнецк", "Новосибирск",
  "Омск", "Оренбург",
  "Пенза", "Пермь", "Петрозаводск", "Псков",
  "Ростов-на-Дону", "Рязань",
  "Самара", "Саратов", "Смоленск", "Сочи", "Ставрополь", "Сургут",
  "Тверь", "Тольятти", "Томск", "Тула", "Тюмень",
  "Улан-Удэ", "Ульяновск", "Уфа",
  "Хабаровск",
  "Чебоксары", "Челябинск", "Чита",
  "Якутск", "Ярославль",
];

interface Game {
  id:             number;
  title:          string;
  city:           string;
  gameDateTime:   string;
  minPlayers:     number;
  status:         "upcoming" | "cancelled" | "completed";
  createdBy:      { id: number; email: string; name: string | null };
  confirmedCount: number;
  waitlistCount:  number;
  myStatus:       "confirmed" | "waitlist" | null;
  latitude:       number | null;
  longitude:      number | null;
  address:        string | null;
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
  const [games,        setGames]        = useState<Game[]>([]);
  const [archivedGames, setArchivedGames] = useState<Game[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [showMap,      setShowMap]      = useState(false);
  const [activeTab,    setActiveTab]    = useState<"open" | "my" | "archive">("open");
  const [isAdmin,      setIsAdmin]      = useState(false);
  const [cityFilter,   setCityFilter]   = useState("");
  const [dateFrom,     setDateFrom]     = useState("");
  const [dateTo,       setDateTo]       = useState("");

  const fetchGames = useCallback(async () => {
    const token   = getAccessToken();
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

    // Detect admin from localStorage (set at login)
    const rawUser = typeof window !== "undefined" ? localStorage.getItem("user") : null;
    const userObj = rawUser ? JSON.parse(rawUser) : null;
    const admin   = !!userObj?.isAdmin;
    setIsAdmin(admin);

    const res = await fetch("/api/games", { headers });
    if (res.ok) setGames(await res.json());

    if (admin && token) {
      const archRes = await fetch("/api/admin/games", { headers });
      if (archRes.ok) setArchivedGames(await archRes.json());
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchGames();
    window.addEventListener("authchange", fetchGames);
    return () => window.removeEventListener("authchange", fetchGames);
  }, [fetchGames]);

  const hasMyGames = useMemo(() => {
    const now = new Date();
    return games.some((g) => g.myStatus !== null && new Date(g.gameDateTime) > now);
  }, [games]);

  const filteredGames = useMemo(() => {
    const now = new Date();
    let base: Game[];
    if (activeTab === "archive") {
      base = archivedGames;
    } else if (activeTab === "open") {
      base = games.filter((g) => g.status === "upcoming" && new Date(g.gameDateTime) > now);
    } else {
      base = games.filter((g) => g.myStatus !== null && new Date(g.gameDateTime) > now);
    }

    return base.filter((g) => {
      if (cityFilter && g.city !== cityFilter) return false;
      const dt = new Date(g.gameDateTime);
      if (dateFrom && dt < new Date(dateFrom)) return false;
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        if (dt > to) return false;
      }
      return true;
    });
  }, [games, archivedGames, activeTab, cityFilter, dateFrom, dateTo]);

  const hasActiveFilters = cityFilter || dateFrom || dateTo;

  if (loading) {
    return (
      <main style={pageStyle}>
        <p style={mutedText}>Загрузка…</p>
      </main>
    );
  }

  const mappableGames = filteredGames.filter(
    (g) => g.status === "upcoming" && g.latitude != null && g.longitude != null,
  );

  return (
    <main style={pageStyle}>

      {showMap && (
        <GamesMap
          games={mappableGames.map((g) => ({
            id:             g.id,
            title:          g.title,
            city:           g.city,
            gameDateTime:   g.gameDateTime,
            confirmedCount: g.confirmedCount,
            minPlayers:     g.minPlayers,
            lat:            g.latitude!,
            lng:            g.longitude!,
          }))}
          onClose={() => setShowMap(false)}
        />
      )}

      <div style={innerStyle}>
        <h1 style={headingStyle}>Игры</h1>

        {/* ── Tabs ── */}
        <div style={tabsRowStyle}>
          <button
            onClick={() => setActiveTab("open")}
            style={activeTab === "open" ? activeTabBtnStyle : tabBtnStyle}
          >
            Открытые игры
          </button>
          <button
            onClick={() => setActiveTab("my")}
            style={{ position: "relative", ...(activeTab === "my" ? activeTabBtnStyle : tabBtnStyle) }}
          >
            Мои игры
            {hasMyGames && <span style={myGamesDotStyle} />}
          </button>
          {isAdmin && (
            <button
              onClick={() => setActiveTab("archive")}
              style={activeTab === "archive" ? activeTabBtnStyle : tabBtnStyle}
            >
              Архивные игры
            </button>
          )}
        </div>

        {/* ── Filters ── */}
        <div style={filtersRowStyle}>
          <div style={filterGroupStyle}>
            <label style={filterLabelStyle}>Город</label>
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              style={selectStyle}
            >
              <option value="">Все города</option>
              {RUSSIAN_CITIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div style={filterGroupStyle}>
            <label style={filterLabelStyle}>Дата с</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={filterGroupStyle}>
            <label style={filterLabelStyle}>Дата по</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              style={inputStyle}
            />
          </div>

          {hasActiveFilters && (
            <button
              onClick={() => { setCityFilter(""); setDateFrom(""); setDateTo(""); }}
              style={clearBtnStyle}
            >
              Сбросить
            </button>
          )}

          {mappableGames.length > 0 && (
            <button onClick={() => setShowMap(true)} style={{ ...mapBtnStyle, marginLeft: "auto" }}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
                <path d="M1 3.5l4.5-2 5 2 4.5-2v11l-4.5 2-5-2-4.5 2v-11z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                <path d="M5.5 1.5v11M10.5 3.5v11" stroke="currentColor" strokeWidth="1.4"/>
              </svg>
              Показать на карте
            </button>
          )}
        </div>

        {filteredGames.length === 0 ? (
          <p style={mutedText}>
            {activeTab === "my"
              ? "Вы пока не участвуете ни в одной предстоящей игре."
              : activeTab === "archive"
                ? "Нет архивных игр."
                : games.length === 0
                  ? "Пока нет ни одной игры. Создайте первую!"
                  : "Нет игр, соответствующих фильтрам."}
          </p>
        ) : (
          <div style={gridStyle}>
            {filteredGames.map((game) => <GameCard key={game.id} game={game} />)}
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

  const isPast = new Date(game.gameDateTime) < new Date();
  const statusColors: Record<Game["status"], { bg: string; color: string; label: string }> = {
    upcoming:  isPast
      ? { bg: "#f1f5f9", color: "#64748b", label: "Истекла"   }
      : { bg: "#eff6ff", color: "#2563eb", label: "Скоро"     },
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
          <span style={cityTextStyle}>{game.address ?? game.city}</span>
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
        {game.waitlistCount > 0 && (
          <span style={{ ...statChipStyle, background: "#fffbeb", color: "#b45309" }}>
            Очередь: <strong>{game.waitlistCount}</strong>
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
  letterSpacing: "-0.4px", color: "var(--foreground)", margin: 0,
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
  display: "flex", alignItems: "flex-start", gap: "4px",
  fontFamily: "var(--font-ui)", fontSize: "13px", fontWeight: 600, color: "var(--muted)",
  overflow: "hidden",
};

const cityTextStyle: React.CSSProperties = {
  display: "-webkit-box",
  WebkitLineClamp: 3,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
};

const badgeBase: React.CSSProperties = {
  padding: "3px 8px", borderRadius: "100px",
  fontSize: "12px", fontWeight: 600, fontFamily: "var(--font-ui)",
};

const titleStyle: React.CSSProperties = {
  fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: "17px",
  letterSpacing: "-0.2px", color: "var(--foreground)", margin: "0 0 8px",
  wordBreak: "break-word",
  display: "-webkit-box",
  WebkitLineClamp: 3,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
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


const mapBtnStyle: React.CSSProperties = {
  display:      "inline-flex",
  alignItems:   "center",
  gap:          "6px",
  padding:      "8px 16px",
  borderRadius: "10px",
  border:       "1.5px solid var(--primary)",
  background:   "transparent",
  color:        "var(--primary)",
  fontFamily:   "var(--font-ui)",
  fontWeight:   600,
  fontSize:     "14px",
  cursor:       "pointer",
  transition:   "background 0.12s",
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

const filtersRowStyle: React.CSSProperties = {
  display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: "12px",
  marginBottom: "24px",
  padding: "16px 20px",
  background: "#ffffff",
  borderRadius: "var(--radius-lg)",
  boxShadow: "var(--shadow-drop)",
};

const filterGroupStyle: React.CSSProperties = {
  display: "flex", flexDirection: "column", gap: "4px",
};

const filterLabelStyle: React.CSSProperties = {
  fontFamily: "var(--font-ui)", fontSize: "12px", fontWeight: 600,
  color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.4px",
};

const sharedInputStyle: React.CSSProperties = {
  height: "36px",
  padding: "0 10px",
  border: "1.5px solid #e5e7eb",
  borderRadius: "8px",
  fontFamily: "var(--font-ui)",
  fontSize: "14px",
  color: "var(--foreground)",
  background: "#fff",
  outline: "none",
};

const selectStyle: React.CSSProperties = {
  ...sharedInputStyle,
  minWidth: "180px",
  paddingRight: "28px",
  appearance: "none",
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 16 16'%3E%3Cpath d='M4 6l4 4 4-4' stroke='%236b7280' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round' fill='none'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 8px center",
};

const inputStyle: React.CSSProperties = {
  ...sharedInputStyle,
  minWidth: "150px",
};

const clearBtnStyle: React.CSSProperties = {
  height: "36px",
  padding: "0 14px",
  border: "1.5px solid #e5e7eb",
  borderRadius: "8px",
  background: "transparent",
  fontFamily: "var(--font-ui)",
  fontSize: "13px",
  fontWeight: 600,
  color: "var(--muted)",
  cursor: "pointer",
  alignSelf: "flex-end",
  transition: "border-color 0.12s, color 0.12s",
};

const tabsRowStyle: React.CSSProperties = {
  display: "flex",
  gap: "8px",
  marginBottom: "16px",
};

const tabBtnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  padding: "8px 18px",
  borderRadius: "10px",
  border: "1.5px solid #e5e7eb",
  background: "transparent",
  color: "var(--muted)",
  fontFamily: "var(--font-ui)",
  fontWeight: 600,
  fontSize: "14px",
  cursor: "pointer",
  transition: "border-color 0.12s, color 0.12s",
};

const activeTabBtnStyle: React.CSSProperties = {
  ...tabBtnStyle,
  border: "1.5px solid var(--primary)",
  background: "var(--primary)",
  color: "#ffffff",
};

const myGamesDotStyle: React.CSSProperties = {
  position: "absolute",
  top: "6px",
  right: "6px",
  width: "8px",
  height: "8px",
  borderRadius: "50%",
  background: "#22c55e",
  border: "1.5px solid #ffffff",
};
