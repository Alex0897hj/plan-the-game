"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken } from "@/app/lib/auth-api";
import LocationPicker, { type PickedLocation } from "@/app/components/LocationPicker";

interface FieldErrors {
  title?:        string;
  description?:  string;
  gameDateTime?: string;
  minPlayers?:   string;
  location?:     string;
}

export default function CreateGamePage() {
  const router = useRouter();

  const [title,        setTitle]        = useState("");
  const [description,  setDescription]  = useState("");
  const [gameDateTime, setGameDateTime] = useState("");
  const [minPlayers,   setMinPlayers]   = useState("");
  const [location,     setLocation]     = useState<PickedLocation | null>(null);
  const [fieldErrors,  setFieldErrors]  = useState<FieldErrors>({});
  const [apiError,     setApiError]     = useState<string | null>(null);
  const [loading,      setLoading]      = useState(false);

  function handleLocationSelect(loc: PickedLocation) {
    setLocation(loc);
    setFieldErrors((prev) => ({ ...prev, location: undefined }));
  }

  function validate(): FieldErrors {
    const e: FieldErrors = {};
    if (!title.trim())       e.title        = "Введите название";
    if (!description.trim()) e.description  = "Введите описание";
    if (!gameDateTime)       e.gameDateTime = "Укажите дату и время";
    const mp = Number(minPlayers);
    if (!minPlayers || isNaN(mp) || mp < 2) e.minPlayers = "Минимум 2 игрока";
    if (!location)           e.location     = "Отметьте место проведения на карте";
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
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title:       title.trim(),
          description: description.trim(),
          city:        location!.city,
          gameDateTime,
          minPlayers:  Number(minPlayers),
          latitude:    location!.lat,
          longitude:   location!.lng,
          address:     location!.address,
        }),
      });

      const data = await res.json();
      if (!res.ok) { setApiError(data?.message ?? "Произошла ошибка"); return; }
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
              placeholder="Например: Футбол во дворе"
              className={`input${fieldErrors.title ? " input--error" : ""}`}
            />
          </Field>

          <Field label="Описание" error={fieldErrors.description}>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Расскажите об игре, правилах, уровне игроков..."
              rows={3}
              className={`input${fieldErrors.description ? " input--error" : ""}`}
              style={{ resize: "vertical", minHeight: "80px" }}
            />
          </Field>

          {/* Map picker — city extracted automatically */}
          <Field label="Место проведения" error={fieldErrors.location}>
            <LocationPicker onSelect={handleLocationSelect} height={320} />
            {location ? (
              <div style={addressConfirmedStyle}>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: "1px" }}>
                  <path d="M8 1.5A4.5 4.5 0 0 0 3.5 6c0 3.5 4.5 8.5 4.5 8.5S12.5 9.5 12.5 6A4.5 4.5 0 0 0 8 1.5Zm0 6a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z" fill="currentColor"/>
                </svg>
                {location.address}
              </div>
            ) : (
              <p style={mapHintStyle}>Кликните на карту, чтобы отметить место</p>
            )}
          </Field>

          <div style={{ display: "flex", gap: "12px" }}>
            <Field label="Дата и время" error={fieldErrors.gameDateTime} style={{ flex: 1 }}>
              <input
                type="datetime-local"
                value={gameDateTime}
                onChange={(e) => setGameDateTime(e.target.value)}
                className={`input${fieldErrors.gameDateTime ? " input--error" : ""}`}
              />
            </Field>

            <Field label="Мин. игроков" error={fieldErrors.minPlayers} style={{ flex: "0 0 140px" }}>
              <input
                type="number"
                value={minPlayers}
                onChange={(e) => setMinPlayers(e.target.value)}
                placeholder="4"
                min={2}
                className={`input${fieldErrors.minPlayers ? " input--error" : ""}`}
              />
            </Field>
          </div>

          {apiError && <div style={apiErrorStyle}>{apiError}</div>}

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
              style={{ flex: 2, opacity: loading ? 0.72 : 1, pointerEvents: loading ? "none" : "auto", borderRadius: "10px", fontSize: "15px" }}
            >
              {loading ? "Создание…" : "Создать игру"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

function Field({ label, error, children, style }: {
  label: string; error?: string; children: React.ReactNode; style?: React.CSSProperties;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px", ...style }}>
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
  maxWidth:     "580px",
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
  fontFamily: "var(--font-ui)",
  fontSize:   "13px",
  fontWeight: 600,
  color:      "var(--foreground)",
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

const addressConfirmedStyle: React.CSSProperties = {
  display:    "flex",
  alignItems: "flex-start",
  gap:        "6px",
  padding:    "8px 10px",
  borderRadius: "8px",
  background: "#f0fdf4",
  color:      "#166534",
  fontFamily: "var(--font-ui)",
  fontSize:   "13px",
};

const mapHintStyle: React.CSSProperties = {
  fontFamily: "var(--font-ui)",
  fontSize:   "13px",
  color:      "var(--muted)",
  margin:     0,
};
