"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiLogin, apiRegister, saveTokens, type ApiError } from "@/app/lib/auth-api";
import { validateAuthForm, hasErrors } from "@/app/lib/validation";

type Mode = "login" | "register";

interface Props {
  initialMode?: Mode;
}

export default function AuthForm({ initialMode = "login" }: Props) {
  const router = useRouter();

  const [mode, setMode]               = useState<Mode>(initialMode);
  const [email, setEmail]             = useState("");
  const [password, setPassword]       = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [apiError, setApiError]       = useState<string | null>(null);
  const [loading, setLoading]         = useState(false);

  function switchMode(next: Mode) {
    setMode(next);
    setFieldErrors({});
    setApiError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setApiError(null);

    const errors = validateAuthForm(email, password);
    if (hasErrors(errors)) { setFieldErrors(errors); return; }
    setFieldErrors({});

    setLoading(true);
    try {
      const data =
        mode === "register"
          ? await apiRegister(email, password)
          : await apiLogin(email, password);
      saveTokens(data);
      router.push("/");
    } catch (err) {
      const apiErr = err as ApiError;
      setApiError(apiErr?.message ?? "Произошла ошибка. Попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  }

  const isRegister = mode === "register";

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>

        {/* Header */}
        <div style={{ marginBottom: "28px" }}>
          <h1 style={headingStyle}>
            {isRegister ? "Создать аккаунт" : "Добро пожаловать"}
          </h1>
          <p style={subheadingStyle}>
            {isRegister
              ? "Зарегистрируйтесь, чтобы начать"
              : "Войдите в свой аккаунт"}
          </p>
        </div>

        {/* Tab switcher */}
        <div style={tabsWrapStyle}>
          {(["login", "register"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => switchMode(m)}
              style={{
                ...tabBtnStyle,
                background:   mode === m ? "#ffffff" : "transparent",
                color:        mode === m ? "var(--foreground)" : "var(--muted)",
                fontWeight:   mode === m ? 700 : 500,
                boxShadow:    mode === m ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
              }}
            >
              {m === "login" ? "Войти" : "Регистрация"}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* Email */}
          <div style={fieldStyle}>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className={`input${fieldErrors.email ? " input--error" : ""}`}
            />
            {fieldErrors.email && <span style={errorTextStyle}>{fieldErrors.email}</span>}
          </div>

          {/* Password */}
          <div style={fieldStyle}>
            <label style={labelStyle}>Пароль</label>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isRegister ? "Минимум 6 символов" : "••••••••"}
                autoComplete={isRegister ? "new-password" : "current-password"}
                className={`input${fieldErrors.password ? " input--error" : ""}`}
                style={{ paddingRight: "80px" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                style={showBtnStyle}
                tabIndex={-1}
              >
                {showPassword ? "Скрыть" : "Показать"}
              </button>
            </div>
            {fieldErrors.password && <span style={errorTextStyle}>{fieldErrors.password}</span>}
          </div>

          {/* API error */}
          {apiError && (
            <div style={apiErrorStyle}>
              {apiError}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{
              width:         "100%",
              marginTop:     "4px",
              opacity:       loading ? 0.72 : 1,
              pointerEvents: loading ? "none" : "auto",
              borderRadius:  "10px",
              fontSize:      "16px",
            }}
          >
            {loading
              ? "Загрузка…"
              : isRegister ? "Зарегистрироваться" : "Войти"}
          </button>
        </form>

        {/* Switch mode */}
        <p style={switchTextStyle}>
          {isRegister ? "Уже есть аккаунт?" : "Нет аккаунта?"}{" "}
          <button
            type="button"
            onClick={() => switchMode(isRegister ? "login" : "register")}
            style={switchBtnStyle}
          >
            {isRegister ? "Войти" : "Зарегистрироваться"}
          </button>
        </p>

      </div>
    </div>
  );
}

/* ─── Styles ──────────────────────────────────────────────── */

const pageStyle: React.CSSProperties = {
  minHeight:      "calc(100vh - 72px)",
  display:        "flex",
  alignItems:     "center",
  justifyContent: "center",
  background:     "var(--surface)",
  padding:        "24px",
};

const cardStyle: React.CSSProperties = {
  width:        "100%",
  maxWidth:     "420px",
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

const tabsWrapStyle: React.CSSProperties = {
  display:       "flex",
  background:    "var(--surface)",
  borderRadius:  "var(--radius-sm)",
  padding:       "4px",
  marginBottom:  "24px",
};

const tabBtnStyle: React.CSSProperties = {
  flex:          1,
  padding:       "8px 12px",
  border:        "none",
  borderRadius:  "6px",
  cursor:        "pointer",
  fontFamily:    "var(--font-ui)",
  fontSize:      "14px",
  letterSpacing: "-0.1px",
  transition:    "background 0.15s ease-out, color 0.15s ease-out, box-shadow 0.15s ease-out",
};

const fieldStyle: React.CSSProperties = {
  display:       "flex",
  flexDirection: "column",
  gap:           "6px",
};

const labelStyle: React.CSSProperties = {
  fontFamily:    "var(--font-ui)",
  fontSize:      "13px",
  fontWeight:    600,
  letterSpacing: "0px",
  color:         "var(--foreground)",
};

const showBtnStyle: React.CSSProperties = {
  position:   "absolute",
  right:      "14px",
  top:        "50%",
  transform:  "translateY(-50%)",
  border:     "none",
  background: "none",
  cursor:     "pointer",
  color:      "var(--primary)",
  fontFamily: "var(--font-ui)",
  fontSize:   "13px",
  fontWeight: 600,
  padding:    "0",
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

const errorTextStyle: React.CSSProperties = {
  fontSize:   "13px",
  color:      "var(--error)",
  fontFamily: "var(--font-ui)",
};

const switchTextStyle: React.CSSProperties = {
  marginTop:  "20px",
  textAlign:  "center",
  fontSize:   "14px",
  color:      "var(--muted)",
  fontFamily: "var(--font-ui)",
};

const switchBtnStyle: React.CSSProperties = {
  border:     "none",
  background: "none",
  cursor:     "pointer",
  color:      "var(--primary)",
  fontWeight: 700,
  fontFamily: "var(--font-ui)",
  fontSize:   "14px",
  padding:    "0",
};
