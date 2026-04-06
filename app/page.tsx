"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { getAccessToken } from "@/app/lib/auth-api";
import InlineSideMap, { type GamePin } from "@/app/components/InlineSideMap";

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

type GameType = "five_x_five" | "seven_x_seven" | "eight_x_eight";

const GAME_TYPE_LABEL: Record<GameType, string> = {
  five_x_five:   "5×5",
  seven_x_seven: "7×7",
  eight_x_eight: "8×8",
};


interface Game {
  id:             number;
  title:          string;
  city:           string;
  gameDateTime:   string;
  gameType:       GameType;
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

export default function Home() {
  const [games,         setGames]         = useState<Game[]>([]);
  const [archivedGames, setArchivedGames] = useState<Game[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [activeTab,     setActiveTab]     = useState<"open" | "my" | "archive">("open");
  const [isLoggedIn,    setIsLoggedIn]    = useState(false);
  const [cityFilter,    setCityFilter]    = useState("");
  const [dateFrom,      setDateFrom]      = useState("");
  const [dateTo,        setDateTo]        = useState("");
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null);

  const listRef  = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<number, HTMLAnchorElement>>(new Map());

  const handleMapSelect = useCallback((id: number) => {
    setSelectedGameId(id);
    const el = cardRefs.current.get(id);
    if (el && listRef.current) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, []);

  const handleCardSelect = useCallback((id: number) => {
    setSelectedGameId(id);
  }, []);

  const fetchGames = useCallback(async () => {
    const token   = getAccessToken();
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

    const rawUser = typeof window !== "undefined" ? localStorage.getItem("user") : null;
    const userObj = rawUser ? JSON.parse(rawUser) : null;
    const admin   = !!userObj?.isAdmin;
    setIsLoggedIn(!!token);

    const res = await fetch("/api/games", { headers });
    if (res.ok) setGames(await res.json());

    if (token) {
      const archUrl  = admin ? "/api/admin/games" : "/api/games/my-archive";
      const archRes  = await fetch(archUrl, { headers });
      if (archRes.ok) setArchivedGames(await archRes.json());
    } else {
      setArchivedGames([]);
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

  const mapPins: GamePin[] = useMemo(() =>
    filteredGames
      .filter((g) => g.status === "upcoming" && g.latitude != null && g.longitude != null)
      .map((g) => ({
        id:             g.id,
        title:          g.title,
        city:           g.city,
        gameDateTime:   g.gameDateTime,
        gameType:       g.gameType,
        confirmedCount: g.confirmedCount,
        minPlayers:     g.minPlayers,
        lat:            g.latitude!,
        lng:            g.longitude!,
      })),
  [filteredGames]);

  const hasActiveFilters = cityFilter || dateFrom || dateTo;

  const emptyMsg = activeTab === "my"
    ? "Вы пока не участвуете ни в одной предстоящей игре."
    : activeTab === "archive"
      ? "Нет архивных игр."
      : games.length === 0
        ? "Пока нет ни одной игры. Создайте первую!"
        : "Нет игр, соответствующих фильтрам.";

  return (
    <main style={mainStyle}>

      {/* ── Left panel ── */}
      <div style={leftPanelStyle}>

        {/* Sticky top: heading + tabs + filters */}
        <div style={topAreaStyle}>
          <h1 style={headingStyle}>Игры</h1>

          {/* Tabs */}
          <div style={tabsRowStyle}>
            <button onClick={() => setActiveTab("open")} style={activeTab === "open" ? activeTabBtn : tabBtn}>
              Открытые
            </button>
            {isLoggedIn && (
              <button
                onClick={() => setActiveTab("my")}
                style={{ position: "relative", ...(activeTab === "my" ? activeTabBtn : tabBtn) }}
              >
                Мои игры
                {hasMyGames && <span style={dotStyle} />}
              </button>
            )}
            {isLoggedIn && (
              <button onClick={() => setActiveTab("archive")} style={activeTab === "archive" ? activeTabBtn : tabBtn}>
                Архив
              </button>
            )}
          </div>

          {/* Filters */}
          <div style={filtersStyle}>
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

            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              style={dateInputStyle}
              placeholder="От"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              style={dateInputStyle}
              placeholder="До"
            />

            {hasActiveFilters && (
              <button
                onClick={() => { setCityFilter(""); setDateFrom(""); setDateTo(""); }}
                style={clearBtnStyle}
              >
                Сбросить
              </button>
            )}
          </div>

          {/* Result count */}
          <p style={countStyle}>
            {loading ? "Загрузка…" : `${filteredGames.length} ${pluralGames(filteredGames.length)}`}
          </p>
        </div>

        {/* Scrollable list */}
        <div ref={listRef} style={listStyle} className="no-scrollbar">
          {loading ? null : filteredGames.length === 0 ? (
            <p style={mutedText}>{emptyMsg}</p>
          ) : (
            filteredGames.map((game) => (
              <GameRow
                key={game.id}
                game={game}
                isSelected={game.id === selectedGameId}
                onSelect={handleCardSelect}
                cardRef={(el) => {
                  if (el) cardRefs.current.set(game.id, el);
                  else cardRefs.current.delete(game.id);
                }}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Right panel: inline map ── */}
      <div style={mapPanelStyle}>
        <div style={mapInnerStyle}>
          <InlineSideMap
            games={mapPins}
            selectedGameId={selectedGameId}
            onSelect={handleMapSelect}
          />
        </div>
      </div>

    </main>
  );
}

function pluralGames(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return "игр";
  if (mod10 === 1) return "игра";
  if (mod10 >= 2 && mod10 <= 4) return "игры";
  return "игр";
}

/* ─── Game Row ──────────────────────────────────────────────── */

function GameRow({ game, isSelected, onSelect, cardRef }: {
  game:       Game;
  isSelected: boolean;
  onSelect:   (id: number) => void;
  cardRef:    (el: HTMLAnchorElement | null) => void;
}) {
  const dt    = new Date(game.gameDateTime);
  const now   = new Date();
  const isPast = dt < now;

  const dayMonth = dt.toLocaleString("ru-RU", { day: "numeric", month: "long" }); // "7 апреля"
  const [day, month] = dayMonth.split(" ");
  const timeStr = dt.toLocaleString("ru-RU", { hour: "2-digit", minute: "2-digit" });

  // "скоро" — в ближайшие 48 часов, игра ещё не прошла
  const hoursLeft = (dt.getTime() - now.getTime()) / 3_600_000;
  const isSoon    = !isPast && game.status === "upcoming" && hoursLeft <= 48;

  const selectedRowStyle: React.CSSProperties = isSelected
    ? { ...rowStyle, boxShadow: "0 0 0 2px var(--primary)", background: "#f5f7ff" }
    : rowStyle;

  return (
    <Link
      href={`/games/${game.id}`}
      style={selectedRowStyle}
      ref={cardRef}
      onClick={() => onSelect(game.id)}
    >

      {/* Left: date block */}
      <div style={datePanelStyle}>
        <span style={dateDayStyle}>{day}</span>
        <span style={dateMonthStyle}>{month}</span>
        <span style={dateTimeStyle}>{timeStr}</span>
      </div>

      {/* Divider */}
      <div style={dividerStyle} />

      {/* Right: info */}
      <div style={rowContentStyle}>

        {/* Title + "Скоро" */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px", marginBottom: "6px" }}>
          <span style={rowTitleStyle}>{game.title}</span>
          {isSoon && (
            <span style={{ ...badgeBase, background: "#fef3c7", color: "#d97706", flexShrink: 0 }}>
              Скоро
            </span>
          )}
        </div>

        {/* Address */}
        {(game.address ?? game.city) && (
          <span style={rowMetaItemStyle}>
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
              <path d="M8 1.5A4.5 4.5 0 0 0 3.5 6c0 3.5 4.5 8.5 4.5 8.5S12.5 9.5 12.5 6A4.5 4.5 0 0 0 8 1.5Zm0 6a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z" fill="currentColor"/>
            </svg>
            {game.address ?? game.city}
          </span>
        )}

        {/* Players */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", margin: "8px 0 6px" }}>
          <span style={chipStyle}>
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
              <circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.4"/>
              <path d="M1.5 13c0-2.485 2.015-4.5 4.5-4.5s4.5 2.015 4.5 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              <circle cx="11.5" cy="5" r="2" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M14.5 13c0-2-1.343-3.678-3.2-4.3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            <strong>{game.confirmedCount}</strong>/{game.minPlayers}
          </span>
          {game.waitlistCount > 0 && (
            <span style={{ ...chipStyle, background: "#fffbeb", color: "#b45309" }}>
              +{game.waitlistCount} в очереди
            </span>
          )}
          {game.myStatus === "confirmed" && (
            <span style={{ ...chipStyle, background: "#f0fdf4", color: "#16a34a" }}>✓ Участвую</span>
          )}
          {game.myStatus === "waitlist" && (
            <span style={{ ...chipStyle, background: "#fffbeb", color: "#b45309" }}>🕐 В очереди</span>
          )}
        </div>

        {/* Game type + Organizer */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "2px" }}>
          <span style={{ ...badgeBase, background: "#f0fdf4", color: "#16a34a" }}>
            {GAME_TYPE_LABEL[game.gameType]}
          </span>
          <span style={creatorStyle}>
            Организатор: {game.createdBy.name ?? game.createdBy.email}
          </span>
        </div>

      </div>
    </Link>
  );
}

/* ─── Styles ──────────────────────────────────────────────── */

const mainStyle: React.CSSProperties = {
  display:    "flex",
  overflow:   "hidden",
  height:     "calc(100dvh - 72px)",
  background: "var(--surface)",
};

const leftPanelStyle: React.CSSProperties = {
  width:          "50%",
  flexShrink:     0,
  display:        "flex",
  flexDirection:  "column",
  overflow:       "hidden",
  borderRight:    "1px solid #e5e7eb",
  background:     "var(--surface)",
};

const topAreaStyle: React.CSSProperties = {
  flexShrink: 0,
  padding:    "16px 20px 0 16px",
  background: "var(--surface)",
};

const listStyle: React.CSSProperties = {
  flex:       1,
  overflowY:  "auto",
  padding:    "12px 20px 16px 16px",
  scrollbarWidth: "none",
  msOverflowStyle: "none",
} as React.CSSProperties;

const mapPanelStyle: React.CSSProperties = {
  flex:     1,
  minWidth: 0,
  padding:  "16px 16px 16px 0",
};

const mapInnerStyle: React.CSSProperties = {
  width:        "100%",
  height:       "100%",
  borderRadius: "16px",
  overflow:     "hidden",
  boxShadow:    "var(--shadow-drop)",
};

const headingStyle: React.CSSProperties = {
  fontFamily:    "var(--font-ui)",
  fontWeight:    800,
  fontSize:      "22px",
  letterSpacing: "-0.4px",
  color:         "var(--foreground)",
  margin:        "0 0 14px",
};

const tabsRowStyle: React.CSSProperties = {
  display:      "flex",
  gap:          "6px",
  marginBottom: "12px",
};

const tabBtn: React.CSSProperties = {
  display:      "inline-flex",
  alignItems:   "center",
  padding:      "6px 14px",
  borderRadius: "8px",
  border:       "1.5px solid #e5e7eb",
  background:   "transparent",
  color:        "var(--muted)",
  fontFamily:   "var(--font-ui)",
  fontWeight:   600,
  fontSize:     "13px",
  cursor:       "pointer",
};

const activeTabBtn: React.CSSProperties = {
  ...tabBtn,
  border:     "1.5px solid var(--primary)",
  background: "var(--primary)",
  color:      "#ffffff",
};

const dotStyle: React.CSSProperties = {
  position:     "absolute",
  top:          "5px",
  right:        "5px",
  width:        "7px",
  height:       "7px",
  borderRadius: "50%",
  background:   "#22c55e",
  border:       "1.5px solid #ffffff",
};

const filtersStyle: React.CSSProperties = {
  display:      "flex",
  flexWrap:     "wrap",
  gap:          "8px",
  marginBottom: "10px",
};

const sharedInput: React.CSSProperties = {
  height:     "34px",
  padding:    "0 10px",
  border:     "1.5px solid #e5e7eb",
  borderRadius: "8px",
  fontFamily: "var(--font-ui)",
  fontSize:   "13px",
  color:      "var(--foreground)",
  background: "#fff",
  outline:    "none",
};

const selectStyle: React.CSSProperties = {
  ...sharedInput,
  minWidth:        "150px",
  paddingRight:    "26px",
  appearance:      "none",
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 16 16'%3E%3Cpath d='M4 6l4 4 4-4' stroke='%236b7280' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round' fill='none'/%3E%3C/svg%3E")`,
  backgroundRepeat:   "no-repeat",
  backgroundPosition: "right 8px center",
};

const dateInputStyle: React.CSSProperties = {
  ...sharedInput,
  minWidth: "130px",
};

const clearBtnStyle: React.CSSProperties = {
  ...sharedInput,
  padding:  "0 12px",
  color:    "var(--muted)",
  cursor:   "pointer",
  fontWeight: 600,
};

const countStyle: React.CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize:   "12px",
  color:      "var(--muted)",
  margin:     "0 0 8px",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.4px",
};

const mutedText: React.CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize:   "14px",
  color:      "var(--muted)",
  padding:    "8px 0",
};

/* ── Row card ── */

const rowStyle: React.CSSProperties = {
  display:        "flex",
  gap:            0,
  background:     "#ffffff",
  borderRadius:   "12px",
  overflow:       "hidden",
  boxShadow:      "var(--shadow-drop)",
  textDecoration: "none",
  color:          "inherit",
  marginBottom:   "10px",
  transition:     "box-shadow 0.15s",
  cursor:         "pointer",
};

const datePanelStyle: React.CSSProperties = {
  width:          "90px",
  flexShrink:     0,
  display:        "flex",
  flexDirection:  "column",
  alignItems:     "center",
  justifyContent: "center",
  padding:        "16px 12px",
  background:     "#f8fafc",
  gap:            "2px",
};

const dateDayStyle: React.CSSProperties = {
  fontFamily:    "var(--font-ui)",
  fontWeight:    800,
  fontSize:      "36px",
  lineHeight:    1,
  color:         "var(--foreground)",
  letterSpacing: "-1px",
};

const dateMonthStyle: React.CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize:   "13px",
  fontWeight: 500,
  color:      "var(--muted)",
  textTransform: "capitalize",
};

const dateTimeStyle: React.CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize:   "12px",
  fontWeight: 600,
  color:      "var(--foreground)",
  marginTop:  "4px",
};

const dividerStyle: React.CSSProperties = {
  width:      "1px",
  flexShrink: 0,
  background: "#e5e7eb",
  alignSelf:  "stretch",
};

const rowContentStyle: React.CSSProperties = {
  flex:          1,
  padding:       "14px 16px",
  minWidth:      0,
  display:       "flex",
  flexDirection: "column",
  justifyContent: "center",
};

const rowTitleStyle: React.CSSProperties = {
  fontFamily:    "var(--font-ui)",
  fontWeight:    700,
  fontSize:      "15px",
  color:         "var(--foreground)",
  letterSpacing: "-0.1px",
  flex:          1,
  minWidth:      0,
  overflow:      "hidden",
  textOverflow:  "ellipsis",
  whiteSpace:    "nowrap",
};

const badgeBase: React.CSSProperties = {
  padding:      "2px 7px",
  borderRadius: "100px",
  fontSize:     "11px",
  fontWeight:   600,
  fontFamily:   "var(--font-ui)",
  whiteSpace:   "nowrap",
};


const rowMetaItemStyle: React.CSSProperties = {
  display:    "inline-flex",
  alignItems: "flex-start",
  gap:        "3px",
  fontFamily: "var(--font-ui)",
  fontSize:   "12px",
  color:      "var(--muted)",
};

const chipStyle: React.CSSProperties = {
  display:      "inline-flex",
  alignItems:   "center",
  gap:          "3px",
  padding:      "2px 8px",
  borderRadius: "100px",
  background:   "#eff6ff",
  color:        "#2563eb",
  fontFamily:   "var(--font-ui)",
  fontSize:     "12px",
};

const creatorStyle: React.CSSProperties = {
  fontFamily:   "var(--font-ui)",
  fontSize:     "12px",
  color:        "var(--muted)",
  whiteSpace:   "nowrap",
  overflow:     "hidden",
  textOverflow: "ellipsis",
  maxWidth:     "120px",
};
