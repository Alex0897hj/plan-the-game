"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken } from "@/app/lib/auth-api";

interface Profile {
  id:            number;
  name:          string;
  email:         string;
  isAdmin:       boolean;
  canCreateGame: boolean;
  telegram:      string | null;
}

type Section = "info" | "password";

export default function ProfilePage() {
  const router = useRouter();
  const [profile,  setProfile]  = useState<Profile | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [section,  setSection]  = useState<Section>("info");

  // Telegram form
  const [telegram,    setTelegram]    = useState("");
  const [tgSaving,    setTgSaving]    = useState(false);
  const [tgMsg,       setTgMsg]       = useState<{ ok: boolean; text: string } | null>(null);

  // Password form
  const [currentPw,   setCurrentPw]   = useState("");
  const [newPw,       setNewPw]       = useState("");
  const [confirmPw,   setConfirmPw]   = useState("");
  const [pwSaving,    setPwSaving]    = useState(false);
  const [pwMsg,       setPwMsg]       = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) { router.push("/login"); return; }

    fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } })
      .then(async (res) => {
        if (!res.ok) { router.push("/login"); return; }
        const data: Profile = await res.json();
        setProfile(data);
        setTelegram(data.telegram ?? "");
      })
      .finally(() => setLoading(false));
  }, [router]);

  async function saveTelegram(e: React.FormEvent) {
    e.preventDefault();
    const token = getAccessToken();
    if (!token || !profile) return;
    setTgSaving(true);
    setTgMsg(null);
    try {
      const res = await fetch("/api/auth/me", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ telegram: telegram.trim() || null }),
      });
      if (res.ok) {
        const updated: Profile = await res.json();
        setProfile(updated);
        setTelegram(updated.telegram ?? "");
        setTgMsg({ ok: true, text: "Сохранено" });
      } else {
        const err = await res.json();
        setTgMsg({ ok: false, text: err.message ?? "Ошибка" });
      }
    } finally {
      setTgSaving(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPw !== confirmPw) {
      setPwMsg({ ok: false, text: "Пароли не совпадают" });
      return;
    }
    if (newPw.length < 6) {
      setPwMsg({ ok: false, text: "Пароль должен содержать не менее 6 символов" });
      return;
    }
    const token = getAccessToken();
    if (!token) return;
    setPwSaving(true);
    setPwMsg(null);
    try {
      const res = await fetch("/api/auth/me", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      if (res.ok) {
        setPwMsg({ ok: true, text: "Пароль успешно изменён" });
        setCurrentPw(""); setNewPw(""); setConfirmPw("");
      } else {
        const err = await res.json();
        setPwMsg({ ok: false, text: err.message ?? "Ошибка" });
      }
    } finally {
      setPwSaving(false);
    }
  }

  if (loading) {
    return (
      <main style={shellStyle}>
        <p style={mutedText}>Загрузка…</p>
      </main>
    );
  }
  if (!profile) return null;

  return (
    <main style={shellStyle}>
      <div style={containerStyle}>

        {/* Header */}
        <div style={pageHeaderStyle}>
          <button onClick={() => router.push("/")} style={backBtnStyle}>← Назад</button>
          <h1 style={pageTitleStyle}>Профиль</h1>
        </div>

        {/* Avatar + name */}
        <div style={avatarRowStyle}>
          <div style={avatarStyle}>{profile.name[0].toUpperCase()}</div>
          <div>
            <p style={nameStyle}>{profile.name}</p>
            <p style={emailStyle}>{profile.email}</p>
          </div>
        </div>

        {/* Tabs */}
        <div style={tabsStyle}>
          <button
            onClick={() => setSection("info")}
            style={section === "info" ? activeTabStyle : tabStyle}
          >
            Основное
          </button>
          <button
            onClick={() => setSection("password")}
            style={section === "password" ? activeTabStyle : tabStyle}
          >
            Сменить пароль
          </button>
        </div>

        {/* ── Section: Info ── */}
        {section === "info" && (
          <div style={cardStyle}>
            <p style={sectionTitle}>Контакты</p>

            <div style={fieldRow}>
              <span style={fieldLabel}>Имя</span>
              <span style={fieldValue}>{profile.name}</span>
            </div>
            <div style={fieldRow}>
              <span style={fieldLabel}>Email</span>
              <span style={fieldValue}>{profile.email}</span>
            </div>

            <div style={{ marginTop: "20px" }}>
              <p style={sectionTitle}>Telegram</p>
              <p style={{ ...mutedText, marginBottom: "12px" }}>
                Укажи username (например, @username) или числовой ID — другие участники смогут написать тебе напрямую.
              </p>
              <form onSubmit={saveTelegram} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <input
                  type="text"
                  value={telegram}
                  onChange={(e) => setTelegram(e.target.value)}
                  placeholder="@username или числовой ID"
                  maxLength={64}
                  style={inputStyle}
                />
                {tgMsg && (
                  <p style={{ margin: 0, fontFamily: "var(--font-ui)", fontSize: "13px", color: tgMsg.ok ? "#16a34a" : "#dc2626" }}>
                    {tgMsg.text}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={tgSaving}
                  style={{ ...primaryBtn, opacity: tgSaving ? 0.6 : 1, alignSelf: "flex-start" }}
                >
                  {tgSaving ? "Сохранение…" : "Сохранить"}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ── Section: Password ── */}
        {section === "password" && (
          <div style={cardStyle}>
            <p style={sectionTitle}>Смена пароля</p>
            <form onSubmit={changePassword} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={labelStyle}>Текущий пароль</label>
                <input
                  type="password"
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  autoComplete="current-password"
                  required
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Новый пароль</label>
                <input
                  type="password"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  autoComplete="new-password"
                  minLength={6}
                  required
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Повторите новый пароль</label>
                <input
                  type="password"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  autoComplete="new-password"
                  required
                  style={inputStyle}
                />
              </div>
              {pwMsg && (
                <p style={{ margin: 0, fontFamily: "var(--font-ui)", fontSize: "13px", color: pwMsg.ok ? "#16a34a" : "#dc2626" }}>
                  {pwMsg.text}
                </p>
              )}
              <button
                type="submit"
                disabled={pwSaving}
                style={{ ...primaryBtn, opacity: pwSaving ? 0.6 : 1, alignSelf: "flex-start" }}
              >
                {pwSaving ? "Сохранение…" : "Изменить пароль"}
              </button>
            </form>
          </div>
        )}

      </div>
    </main>
  );
}

/* ─── Styles ───────────────────────────────────────────────── */

const shellStyle: React.CSSProperties = {
  flex: 1, background: "var(--surface)", padding: "40px 24px",
};

const containerStyle: React.CSSProperties = {
  maxWidth: "520px", margin: "0 auto",
};

const pageHeaderStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px",
};

const pageTitleStyle: React.CSSProperties = {
  fontFamily: "var(--font-ui)", fontWeight: 800, fontSize: "22px",
  letterSpacing: "-0.4px", color: "var(--foreground)", margin: 0,
};

const backBtnStyle: React.CSSProperties = {
  background: "none", border: "none", cursor: "pointer",
  fontFamily: "var(--font-ui)", fontSize: "14px", fontWeight: 600,
  color: "var(--muted)", padding: 0,
};

const avatarRowStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: "14px", marginBottom: "24px",
};

const avatarStyle: React.CSSProperties = {
  width: "56px", height: "56px", borderRadius: "50%",
  background: "var(--primary)", color: "#fff",
  display: "flex", alignItems: "center", justifyContent: "center",
  fontFamily: "var(--font-ui)", fontWeight: 700, fontSize: "22px",
  flexShrink: 0,
};

const nameStyle: React.CSSProperties = {
  margin: 0, fontFamily: "var(--font-ui)", fontWeight: 700,
  fontSize: "18px", color: "var(--foreground)",
};

const emailStyle: React.CSSProperties = {
  margin: "2px 0 0", fontFamily: "var(--font-ui)", fontSize: "13px", color: "var(--muted)",
};

const tabsStyle: React.CSSProperties = {
  display: "flex", gap: "4px", marginBottom: "16px",
};

const tabBase: React.CSSProperties = {
  padding: "7px 16px", borderRadius: "8px", border: "1.5px solid #e5e7eb",
  cursor: "pointer", fontFamily: "var(--font-ui)", fontWeight: 600, fontSize: "13px",
  background: "transparent",
};

const tabStyle: React.CSSProperties = {
  ...tabBase, color: "var(--muted)",
};

const activeTabStyle: React.CSSProperties = {
  ...tabBase, background: "var(--primary)", color: "#fff", border: "1.5px solid var(--primary)",
};

const cardStyle: React.CSSProperties = {
  background: "#fff", borderRadius: "var(--radius-lg)",
  padding: "22px", boxShadow: "var(--shadow-drop)",
};

const sectionTitle: React.CSSProperties = {
  margin: "0 0 14px", fontFamily: "var(--font-ui)", fontWeight: 700,
  fontSize: "13px", color: "var(--foreground)",
};

const fieldRow: React.CSSProperties = {
  display: "flex", justifyContent: "space-between", alignItems: "center",
  padding: "8px 0", borderBottom: "1px solid #f1f5f9",
};

const fieldLabel: React.CSSProperties = {
  fontFamily: "var(--font-ui)", fontSize: "13px", color: "var(--muted)",
};

const fieldValue: React.CSSProperties = {
  fontFamily: "var(--font-ui)", fontSize: "14px", fontWeight: 600, color: "var(--foreground)",
};

const labelStyle: React.CSSProperties = {
  display: "block", fontFamily: "var(--font-ui)", fontSize: "13px",
  fontWeight: 600, color: "var(--foreground)", marginBottom: "6px",
};

const inputStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box",
  border: "1.5px solid #e5e7eb", borderRadius: "8px",
  padding: "9px 12px", fontFamily: "var(--font-ui)", fontSize: "14px",
  background: "#f8fafc", color: "var(--foreground)", outline: "none",
};

const primaryBtn: React.CSSProperties = {
  padding: "9px 20px", borderRadius: "8px",
  background: "var(--primary)", color: "#fff", border: "none",
  cursor: "pointer", fontFamily: "var(--font-ui)", fontWeight: 600, fontSize: "14px",
};

const mutedText: React.CSSProperties = {
  margin: 0, fontFamily: "var(--font-ui)", fontSize: "13px", color: "var(--muted)",
};
