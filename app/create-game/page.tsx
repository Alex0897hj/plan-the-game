"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken } from "@/app/lib/auth-api";
import LocationPicker, { type PickedLocation } from "@/app/components/LocationPicker";

type GameType = "five_x_five" | "seven_x_seven" | "eight_x_eight";

const GAME_TYPES: Record<GameType, { label: string; minPlayers: number }> = {
  five_x_five:   { label: "5×5", minPlayers: 10 },
  seven_x_seven: { label: "7×7", minPlayers: 14 },
  eight_x_eight: { label: "8×8", minPlayers: 16 },
};

interface FieldErrors {
  title?:        string;
  description?:  string;
  gameDateTime?: string;
  gameType?:     string;
  location?:     string;
}

export default function CreateGamePage() {
  const router = useRouter();

  useEffect(() => {
    const raw = localStorage.getItem("user");
    const user = raw ? JSON.parse(raw) : null;
    if (!getAccessToken() || !user || user.canCreateGame === false) {
      router.replace("/");
    }
  }, [router]);

  const [title,        setTitle]        = useState("");
  const [description,  setDescription]  = useState("");
  const [gameDateTime, setGameDateTime] = useState("");
  const [gameType,     setGameType]     = useState<GameType>("five_x_five");
  const [isIndoor,     setIsIndoor]     = useState<"" | "true" | "false">("");
  const [surfaceType,  setSurfaceType]  = useState<"" | "artificial_turf" | "natural_grass" | "parquet">("");
  const [hasLocker,    setHasLocker]    = useState<"" | "true" | "false">("");
  const [hasLighting,  setHasLighting]  = useState<"" | "true" | "false">("");
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
    if (!gameType)           e.gameType     = "Выберите формат игры";
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
          gameType,
          latitude:    location!.lat,
          longitude:   location!.lng,
          address:     location!.address,
          isIndoor:    isIndoor    === "" ? null : isIndoor    === "true",
          surfaceType: surfaceType === "" ? null : surfaceType,
          hasLocker:   hasLocker   === "" ? null : hasLocker   === "true",
          hasLighting: hasLighting === "" ? null : hasLighting === "true",
        }),
      });

      const data = await res.json();
      if (!res.ok) { setApiError(data?.message ?? "Произошла ошибка"); return; }
      router.push(`/games/${data.id}`);
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
              maxLength={160}
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

            <Field label="Формат игры" error={fieldErrors.gameType} style={{ flex: "0 0 180px" }}>
              <select
                value={gameType}
                onChange={(e) => setGameType(e.target.value as GameType)}
                className={`input${fieldErrors.gameType ? " input--error" : ""}`}
              >
                {(Object.entries(GAME_TYPES) as [GameType, { label: string; minPlayers: number }][]).map(([key, cfg]) => (
                  <option key={key} value={key}>
                    {cfg.label} ({cfg.minPlayers} игроков)
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <Field label="Тип площадки" style={{ flex: "1 1 140px" }}>
              <select value={isIndoor} onChange={(e) => setIsIndoor(e.target.value as "" | "true" | "false")} className="input">
                <option value="">не выбрано</option>
                <option value="true">крытая</option>
                <option value="false">открытая</option>
              </select>
            </Field>

            <Field label="Тип покрытия" style={{ flex: "1 1 160px" }}>
              <select value={surfaceType} onChange={(e) => setSurfaceType(e.target.value as "" | "artificial_turf" | "natural_grass" | "parquet")} className="input">
                <option value="">не выбрано</option>
                <option value="artificial_turf">искусственная трава</option>
                <option value="natural_grass">натуральная трава</option>
                <option value="parquet">паркет</option>
              </select>
            </Field>

            <Field label="Раздевалки" style={{ flex: "1 1 120px" }}>
              <select value={hasLocker} onChange={(e) => setHasLocker(e.target.value as "" | "true" | "false")} className="input">
                <option value="">не выбрано</option>
                <option value="true">есть</option>
                <option value="false">нет</option>
              </select>
            </Field>

            <Field label="Освещение" style={{ flex: "1 1 120px" }}>
              <select value={hasLighting} onChange={(e) => setHasLighting(e.target.value as "" | "true" | "false")} className="input">
                <option value="">не выбрано</option>
                <option value="true">есть</option>
                <option value="false">нет</option>
              </select>
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
