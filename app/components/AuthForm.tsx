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

  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function switchMode(next: Mode) {
    setMode(next);
    setFieldErrors({});
    setApiError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setApiError(null);

    const errors = validateAuthForm(email, password);
    if (hasErrors(errors)) {
      setFieldErrors(errors);
      return;
    }
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
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--background)",
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "400px",
          background: "var(--background)",
          border: "1px solid rgba(0,0,0,0.08)",
          borderRadius: "16px",
          padding: "40px 32px",
          boxShadow: "0 4px 24px rgba(89,60,251,0.06)",
        }}
      >
        {/* Tabs */}
        <div
          style={{
            display: "flex",
            marginBottom: "32px",
            background: "rgba(89,60,251,0.06)",
            borderRadius: "8px",
            padding: "4px",
          }}
        >
          {(["login", "register"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => switchMode(m)}
              style={{
                flex: 1,
                padding: "8px",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontFamily: "var(--font-ui)",
                fontWeight: 700,
                fontSize: "14px",
                letterSpacing: "-0.1px",
                transition: "background-color 0.15s ease-out, color 0.15s ease-out",
                background: mode === m ? "var(--primary)" : "transparent",
                color: mode === m ? "#fff" : "var(--foreground)",
              }}
            >
              {m === "login" ? "Войти" : "Зарегистрироваться"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Email */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              style={{
                ...inputStyle,
                borderColor: fieldErrors.email ? "#e53e3e" : "rgba(0,0,0,0.12)",
              }}
            />
            {fieldErrors.email && <span style={errorTextStyle}>{fieldErrors.email}</span>}
          </div>

          {/* Password */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={labelStyle}>Пароль</label>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isRegister ? "Минимум 6 символов" : "••••••••"}
                autoComplete={isRegister ? "new-password" : "current-password"}
                style={{
                  ...inputStyle,
                  borderColor: fieldErrors.password ? "#e53e3e" : "rgba(0,0,0,0.12)",
                  paddingRight: "44px",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  color: "rgba(0,0,0,0.4)",
                  fontSize: "13px",
                  fontFamily: "var(--font-ui)",
                  padding: "0",
                }}
                tabIndex={-1}
              >
                {showPassword ? "скрыть" : "показать"}
              </button>
            </div>
            {fieldErrors.password && <span style={errorTextStyle}>{fieldErrors.password}</span>}
          </div>

          {/* API error */}
          {apiError && (
            <div
              style={{
                padding: "12px",
                borderRadius: "8px",
                background: "rgba(229,62,62,0.08)",
                border: "1px solid rgba(229,62,62,0.2)",
                color: "#c53030",
                fontSize: "14px",
                fontFamily: "var(--font-ui)",
              }}
            >
              {apiError}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: "100%", justifyContent: "center", opacity: loading ? 0.7 : 1 }}
          >
            {loading ? "Загрузка…" : isRegister ? "Зарегистрироваться" : "Войти"}
          </button>
        </form>

        {/* Switch link */}
        <p
          style={{
            marginTop: "20px",
            textAlign: "center",
            fontSize: "14px",
            color: "rgba(0,0,0,0.5)",
            fontFamily: "var(--font-ui)",
          }}
        >
          {isRegister ? "Уже есть аккаунт?" : "Нет аккаунта?"}{" "}
          <button
            type="button"
            onClick={() => switchMode(isRegister ? "login" : "register")}
            style={{
              border: "none",
              background: "none",
              cursor: "pointer",
              color: "var(--primary)",
              fontWeight: 700,
              fontFamily: "var(--font-ui)",
              fontSize: "14px",
              padding: "0",
            }}
          >
            {isRegister ? "Войти" : "Зарегистрироваться"}
          </button>
        </p>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: 600,
  fontFamily: "var(--font-ui)",
  color: "var(--foreground)",
  letterSpacing: "-0.1px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 15px",
  border: "1px solid rgba(0,0,0,0.12)",
  borderRadius: "8px",
  fontSize: "16px",
  fontFamily: "var(--font-ui)",
  background: "var(--background)",
  color: "var(--foreground)",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.15s ease-out",
};

const errorTextStyle: React.CSSProperties = {
  fontSize: "13px",
  color: "#e53e3e",
  fontFamily: "var(--font-ui)",
};
