"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken } from "@/app/lib/auth-api";

interface FieldErrors {
  title?:       string;
  description?: string;
  city?:        string;
  gameDateTime?: string;
  minPlayers?:  string;
}

export default function CreateGamePage() {
  const router = useRouter();

  const [title,        setTitle]        = useState("");
  const [description,  setDescription]  = useState("");
  const [city,         setCity]         = useState("");
  const [gameDateTime, setGameDateTime] = useState("");
  const [minPlayers,   setMinPlayers]   = useState("");
  const [fieldErrors,  setFieldErrors]  = useState<FieldErrors>({});
  const [apiError,     setApiError]     = useState<string | null>(null);
  const [loading,      setLoading]      = useState(false);

  function validate(): FieldErrors {
    const e: FieldErrors = {};
    if (!title.trim())       e.title        = "Введите название";
    if (!description.trim()) e.description  = "Введите описание";
    if (!city.trim())        e.city         = "Введите город";
    if (!gameDateTime)       e.gameDateTime = "Укажите дату и время";
    const mp = Number(minPlayers);
    if (!minPlayers || isNaN(mp) || mp < 2)
      e.minPlayers = "Минимум 2 игрока";
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setApiError(null);

    const errors = validate();
    if (Object.keys(errors).length) { setFieldErrors(errors); return; }
    setFieldErrors({});

    const token = getAccessToken();
    if (!token) { router.push("/login"); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/games", {
        method:  "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          title:        title.trim(),
          description:  description.trim(),
          city:         city.trim(),
          gameDateTime,
          minPlayers:   Number(minPlayers),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setApiError(data?.message ?? "Произошла ошибка");
        return;
      }

      router.push("/");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>

        <div style={{ marginBottom: "28px" }}>
          <h1 style={headingStyle}>Создать игру</h1>
          <p style={subheadingStyle}>Заполните информацию об игре</p>
        </div>

        <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          <Field label="Название" error={fieldErrors.title}>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например: Мафия у Артёма"
              className={`input${fieldErrors.title ? " input--error" : ""}`}
            />
          </Field>

          <Field label="Описание" error={fieldErrors.description}>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Расскажите об игре, правилах, месте встречи..."
              rows={4}
              className={`input${fieldErrors.description ? " input--error" : ""}`}
              style={{ resize: "vertical", minHeight: "96px" }}
            />
          </Field>

          <Field label="Город" error={fieldErrors.city}>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Москва"
              className={`input${fieldErrors.city ? " input--error" : ""}`}
            />
          </Field>

          <Field label="Дата и время" error={fieldErrors.gameDateTime}>
            <input
              type="datetime-local"
              value={gameDateTime}
              onChange={(e) => setGameDateTime(e.target.value)}
              className={`input${fieldErrors.gameDateTime ? " input--error" : ""}`}
            />
          </Field>

          <Field label="Минимум игроков" error={fieldErrors.minPlayers}>
            <input
              type="number"
              value={minPlayers}
              onChange={(e) => setMinPlayers(e.target.value)}
              placeholder="4"
              min={2}
              className={`input${fieldErrors.minPlayers ? " input--error" : ""}`}
            />
          </Field>

          {apiError && (
            <div style={apiErrorStyle}>{apiError}</div>
          )}

          <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
            <button
              type="button"
              onClick={() => router.back()}
              className="btn btn-ghost"
              style={{ flex: 1, borderRadius: "10px", fontSize: "15px" }}
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{
                flex:          2,
                opacity:       loading ? 0.72 : 1,
                pointerEvents: loading ? "none" : "auto",
                borderRadius:  "10px",
                fontSize:      "15px",
              }}
            >
              {loading ? "Создание…" : "Создать игру"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <label style={labelStyle}>{label}</label>
      {children}
      {error && <span style={errorTextStyle}>{error}</span>}
    </div>
  );
}

/* ─── Styles ──────────────────────────────────────────────── */

const pageStyle: React.CSSProperties = {
  minHeight:      "calc(100vh - 72px)",
  display:        "flex",
  alignItems:     "flex-start",
  justifyContent: "center",
  background:     "var(--surface)",
  padding:        "40px 24px",
};

const cardStyle: React.CSSProperties = {
  width:        "100%",
  maxWidth:     "520px",
  background:   "#ffffff",
  borderRadius: "var(--radius-lg)",
  padding:      "36px 32px",
  boxShadow:    "var(--shadow-drop)",
};

const headingStyle: React.CSSProperties = {
  fontFamily:    "var(--font-ui)",
  fontWeight:    800,
  fontSize:      "24px",
  letterSpacing: "-0.4px",
  color:         "var(--foreground)",
  margin:        "0 0 4px",
};

const subheadingStyle: React.CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize:   "15px",
  color:      "var(--muted)",
  margin:     0,
};

const labelStyle: React.CSSProperties = {
  fontFamily:    "var(--font-ui)",
  fontSize:      "13px",
  fontWeight:    600,
  color:         "var(--foreground)",
};

const errorTextStyle: React.CSSProperties = {
  fontSize:   "13px",
  color:      "var(--error)",
  fontFamily: "var(--font-ui)",
};

const apiErrorStyle: React.CSSProperties = {
  padding:      "12px 14px",
  borderRadius: "var(--radius-sm)",
  background:   "var(--error-soft)",
  border:       "1px solid rgba(220,38,38,0.15)",
  color:        "var(--error)",
  fontSize:     "14px",
  fontFamily:   "var(--font-ui)",
};
