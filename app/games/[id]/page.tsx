"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { getAccessToken } from "@/app/lib/auth-api";
import LocationMap from "@/app/components/LocationMap";

type ParticipantStatus = "confirmed" | "thinking";

interface Player {
  id:    number;
  email: string;
  name:  string | null;
}

interface Game {
  id:             number;
  title:          string;
  description:    string;
  city:           string;
  gameDateTime:   string;
  minPlayers:     number;
  status:         "upcoming" | "cancelled" | "completed";
  createdBy:      Player;
  confirmedCount: number;
  thinkingCount:  number;
  confirmedList:  Player[];
  thinkingList:   Player[];
  myStatus:       ParticipantStatus | null;
  latitude:       number | null;
  longitude:      number | null;
  address:        string | null;
}

export default function GamePage() {
  const { id }  = useParams<{ id: string }>();
  const router  = useRouter();

  const [game,        setGame]        = useState<Game | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [notFound,    setNotFound]    = useState(false);
  const [acting,      setActing]      = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [cancelling,  setCancelling]  = useState(false);

  const fetchGame = useCallback(async () => {
    const token   = getAccessToken();
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await fetch(`/api/games/${id}`, { headers });
    if (res.status === 404) { setNotFound(true); setLoading(false); return; }
    if (res.ok) setGame(await res.json());
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchGame(); }, [fetchGame]);

  async function participate(status: ParticipantStatus) {
    const token = getAccessToken();
    if (!token || !game) return;
    setActing(true);

    if (game.myStatus === status) {
      await fetch(`/api/games/${game.id}/participate`, {
        method:  "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
    } else {
      await fetch(`/api/games/${game.id}/participate`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ status }),
      });
    }

    await fetchGame();
    setActing(false);
  }

  async function cancelGame() {
    const token = getAccessToken();
    if (!token || !game) return;
    setCancelling(true);
    await fetch(`/api/games/${game.id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body:    JSON.stringify({ status: "cancelled" }),
    });
    setCancelling(false);
    router.push("/");
  }

  if (loading)          return <PageShell><p style={mutedText}>Загрузка…</p></PageShell>;
  if (notFound || !game) return <PageShell><p style={mutedText}>Игра не найдена.</p></PageShell>;

  const currentUser    = (() => { try { return JSON.parse(localStorage.getItem("user") ?? "null"); } catch { return null; } })();
  const isLoggedIn     = !!getAccessToken();
  const isCreator      = isLoggedIn && currentUser?.id === game.createdBy.id;
  const canParticipate = isLoggedIn && !isCreator && game.status === "upcoming";
  const canCancel      = isCreator && game.status === "upcoming";

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

  return (
    <PageShell>

      {/* ── Confirmation modal ── */}
      {showConfirm && (
        <div style={overlayStyle} onClick={() => setShowConfirm(false)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <h2 style={modalTitleStyle}>Отменить игру?</h2>
            <p style={modalBodyStyle}>
              Игра «{game.title}» будет отмечена как отменённая. Это действие нельзя отменить.
            </p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => setShowConfirm(false)}
                className="btn btn-ghost"
                style={{ flex: 1, borderRadius: "10px" }}
              >
                Назад
              </button>
              <button
                onClick={cancelGame}
                disabled={cancelling}
                className="btn"
                style={{
                  flex: 1, borderRadius: "10px",
                  background: "var(--error, #dc2626)", color: "#fff",
                  border: "none", cursor: cancelling ? "not-allowed" : "pointer",
                  opacity: cancelling ? 0.7 : 1,
                  fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: "15px",
                  padding: "10px 20px", minHeight: "40px",
                }}
              >
                {cancelling ? "Отмена…" : "Отменить игру"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={layoutStyle}>

        {/* ── Main column ── */}
        <div style={mainColStyle}>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <button onClick={() => router.back()} style={backBtnStyle}>
              ← Назад
            </button>
            {canCancel && (
              <button
                onClick={() => setShowConfirm(true)}
                style={cancelBtnStyle}
              >
                Отменить игру
              </button>
            )}
          </div>

          {/* Info card */}
          <div style={cardStyle}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <span style={cityStyle}>
                <PinIcon /> {game.city}
              </span>
              <span style={{ ...badgeBase, background: badge.bg, color: badge.color }}>
                {badge.label}
              </span>
            </div>

            <h1 style={titleStyle}>{game.title}</h1>

            <p style={metaRowStyle}>
              <CalIcon /> {dateStr}
            </p>

            <p style={descStyle}>{game.description}</p>

            <p style={organizerStyle}>
              Организатор: <strong>{game.createdBy.name ?? game.createdBy.email}</strong>
            </p>
          </div>

          {/* Map — only rendered when coordinates exist */}
          {game.latitude != null && game.longitude != null && (
            <div style={cardStyle}>
              <LocationMap
                lat={game.latitude}
                lng={game.longitude}
                address={game.address}
                height={280}
              />
            </div>
          )}

          {/* Participation */}
          {canParticipate && (
            <div style={cardStyle}>
              <p style={sectionLabel}>Ваш статус</p>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  disabled={acting}
                  onClick={() => participate("confirmed")}
                  style={{
                    ...actionBtn,
                    background: game.myStatus === "confirmed" ? "var(--primary)" : "transparent",
                    color:      game.myStatus === "confirmed" ? "#fff" : "var(--primary)",
                    border:     "1.5px solid var(--primary)",
                    opacity:    acting ? 0.6 : 1,
                  }}
                >
                  {game.myStatus === "confirmed" ? "Участвую ✓" : "Участвовать"}
                </button>
                <button
                  disabled={acting}
                  onClick={() => participate("thinking")}
                  style={{
                    ...actionBtn,
                    background: game.myStatus === "thinking" ? "#f59e0b" : "transparent",
                    color:      game.myStatus === "thinking" ? "#fff" : "#b45309",
                    border:     "1.5px solid #f59e0b",
                    opacity:    acting ? 0.6 : 1,
                  }}
                >
                  {game.myStatus === "thinking" ? "Думаю… ✓" : "Думаю"}
                </button>
              </div>
              {game.myStatus && (
                <p style={{ ...mutedText, marginTop: "8px", fontSize: "12px" }}>
                  Нажмите на активную кнопку повторно, чтобы отменить участие.
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Side column ── */}
        <div style={sideColStyle}>

          <div style={cardStyle}>
            <p style={sectionLabel}>
              Участвуют
              <span style={countBadge}>{game.confirmedCount}/{game.minPlayers}</span>
            </p>
            {game.confirmedList.length === 0
              ? <p style={mutedText}>Пока никого нет</p>
              : (
                <ul style={listStyle}>
                  {game.confirmedList.map((p) => (
                    <li key={p.id} style={playerRowStyle}>
                      <Avatar email={p.email} />
                      <span style={playerName}>{p.name ?? p.email}</span>
                    </li>
                  ))}
                </ul>
              )
            }
          </div>

          <div style={cardStyle}>
            <p style={sectionLabel}>
              Думают
              <span style={{ ...countBadge, background: "#fffbeb", color: "#b45309" }}>
                {game.thinkingCount}
              </span>
            </p>
            {game.thinkingList.length === 0
              ? <p style={mutedText}>Пока никого нет</p>
              : (
                <ul style={listStyle}>
                  {game.thinkingList.map((p) => (
                    <li key={p.id} style={playerRowStyle}>
                      <Avatar email={p.email} />
                      <span style={playerName}>{p.name ?? p.email}</span>
                    </li>
                  ))}
                </ul>
              )
            }
          </div>

        </div>
      </div>
    </PageShell>
  );
}

/* ─── Small components ───────────────────────────────────── */

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main style={{ flex: 1, background: "var(--surface)", padding: "40px 24px" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>{children}</div>
    </main>
  );
}

function Avatar({ email }: { email: string }) {
  return (
    <span style={{
      width: "28px", height: "28px", borderRadius: "50%",
      background: "var(--primary)", color: "#fff",
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: "12px",
      flexShrink: 0,
    }}>
      {email[0].toUpperCase()}
    </span>
  );
}

function PinIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <path d="M8 1.5A4.5 4.5 0 0 0 3.5 6c0 3.5 4.5 8.5 4.5 8.5S12.5 9.5 12.5 6A4.5 4.5 0 0 0 8 1.5Zm0 6a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z" fill="currentColor"/>
    </svg>
  );
}

function CalIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: "1px" }}>
      <rect x="1.5" y="2.5" width="13" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M5 1v3M11 1v3M1.5 6.5h13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}

/* ─── Styles ─────────────────────────────────────────────── */

const layoutStyle: React.CSSProperties = {
  display: "flex", gap: "20px", alignItems: "flex-start",
};

const mainColStyle: React.CSSProperties = {
  flex: "1 1 0", minWidth: 0, display: "flex", flexDirection: "column", gap: "16px",
};

const sideColStyle: React.CSSProperties = {
  width: "280px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "16px",
};

const cardStyle: React.CSSProperties = {
  background: "#ffffff", borderRadius: "var(--radius-lg)",
  padding: "20px", boxShadow: "var(--shadow-drop)",
};

const backBtnStyle: React.CSSProperties = {
  background: "none", border: "none", cursor: "pointer",
  fontFamily: "var(--font-ui)", fontSize: "14px", fontWeight: 600,
  color: "var(--muted)", padding: "0", alignSelf: "flex-start",
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
  fontFamily: "var(--font-ui)", fontWeight: 800, fontSize: "22px",
  letterSpacing: "-0.4px", color: "var(--foreground)", margin: "0 0 10px",
};

const metaRowStyle: React.CSSProperties = {
  display: "flex", alignItems: "flex-start", gap: "5px",
  fontFamily: "var(--font-ui)", fontSize: "14px", color: "var(--muted)", margin: "0 0 14px",
};

const descStyle: React.CSSProperties = {
  fontFamily: "var(--font-ui)", fontSize: "15px", color: "var(--foreground)",
  lineHeight: "1.6", margin: "0 0 14px", whiteSpace: "pre-wrap",
};

const organizerStyle: React.CSSProperties = {
  fontFamily: "var(--font-ui)", fontSize: "13px", color: "var(--muted)", margin: 0,
};

const sectionLabel: React.CSSProperties = {
  fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: "13px",
  color: "var(--foreground)", margin: "0 0 12px",
  display: "flex", alignItems: "center", gap: "6px",
};

const countBadge: React.CSSProperties = {
  padding: "2px 7px", borderRadius: "100px",
  background: "#eff6ff", color: "#2563eb",
  fontSize: "12px", fontWeight: 700, fontFamily: "var(--font-ui)",
};

const listStyle: React.CSSProperties = {
  listStyle: "none", margin: 0, padding: 0,
  display: "flex", flexDirection: "column", gap: "8px",
};

const playerRowStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: "8px",
};

const playerName: React.CSSProperties = {
  fontFamily: "var(--font-ui)", fontSize: "14px", color: "var(--foreground)",
  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
};

const actionBtn: React.CSSProperties = {
  flex: 1, padding: "9px 14px", borderRadius: "8px", cursor: "pointer",
  fontFamily: "var(--font-ui)", fontSize: "14px", fontWeight: 600,
  transition: "opacity 0.12s",
};

const mutedText: React.CSSProperties = {
  fontFamily: "var(--font-ui)", fontSize: "13px", color: "var(--muted)", margin: 0,
};

const cancelBtnStyle: React.CSSProperties = {
  background:   "none",
  border:       "1.5px solid var(--error, #dc2626)",
  color:        "var(--error, #dc2626)",
  borderRadius: "8px",
  padding:      "6px 14px",
  cursor:       "pointer",
  fontFamily:   "var(--font-ui)",
  fontSize:     "13px",
  fontWeight:   600,
};

const overlayStyle: React.CSSProperties = {
  position:        "fixed",
  inset:           0,
  background:      "rgba(0,0,0,0.4)",
  display:         "flex",
  alignItems:      "center",
  justifyContent:  "center",
  zIndex:          500,
  padding:         "24px",
};

const modalStyle: React.CSSProperties = {
  background:   "#ffffff",
  borderRadius: "var(--radius-lg)",
  padding:      "28px 28px 24px",
  maxWidth:     "420px",
  width:        "100%",
  boxShadow:    "0 8px 32px rgba(0,0,0,0.18)",
};

const modalTitleStyle: React.CSSProperties = {
  fontFamily:    "var(--font-ui)",
  fontWeight:    800,
  fontSize:      "18px",
  letterSpacing: "-0.3px",
  color:         "var(--foreground)",
  margin:        "0 0 10px",
};

const modalBodyStyle: React.CSSProperties = {
  fontFamily:  "var(--font-ui)",
  fontSize:    "14px",
  color:       "var(--muted)",
  lineHeight:  "1.5",
  margin:      "0 0 20px",
};
