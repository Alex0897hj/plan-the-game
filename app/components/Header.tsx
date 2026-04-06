"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { clearTokens } from "@/app/lib/auth-api";

interface User {
  id:            number;
  email:         string;
  name:          string;
  isAdmin:       boolean;
  canCreateGame: boolean;
}

export default function Header() {
  const router   = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function syncUser() {
      const raw = localStorage.getItem("user");
      if (raw) {
        try { setUser(JSON.parse(raw)); } catch { setUser(null); }
      } else {
        setUser(null);
      }
    }

    syncUser();
    window.addEventListener("authchange", syncUser);
    return () => window.removeEventListener("authchange", syncUser);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function handleLogout() {
    clearTokens();
    setUser(null);
    setOpen(false);
    router.push("/");
  }

  function handleProfile() {
    setOpen(false);
    router.push("/profile");
  }

  const initial = (user?.name ?? user?.email ?? "?")?.[0].toUpperCase();

  return (
    <header
      style={{
        display:        "flex",
        alignItems:     "center",
        justifyContent: "space-between",
        padding:        "0 24px",
        height:         "72px",
        background:     "#ffffff",
        boxShadow:      "0 1px 0 rgba(0,0,0,0.06)",
        position:       "sticky",
        top:            0,
        zIndex:         100,
      }}
    >
      {/* Logo */}
      <Link
        href="/"
        style={{
          fontFamily:     "var(--font-ui)",
          fontWeight:     900,
          fontSize:       "20px",
          letterSpacing:  "-0.5px",
          color:          "var(--foreground)",
          textDecoration: "none",
          userSelect:     "none",
        }}
      >
        Plan<span style={{ color: "var(--primary)" }}>the</span>Game
      </Link>

      {/* Actions */}
      <nav style={{ display: "flex", alignItems: "center", gap: "4px" }}>
        {user ? (
          <>
          {user.isAdmin && (
            <Link
              href="/admin/users"
              className="btn btn-ghost"
              style={{ fontSize: "14px", padding: "8px 14px", minHeight: "40px", borderRadius: "10px", color: "var(--muted)" }}
            >
              Управление участниками
            </Link>
          )}
          {user.canCreateGame && (
            <Link
              href="/create-game"
              className="btn btn-primary"
              style={{ fontSize: "15px", padding: "10px 20px", minHeight: "40px", borderRadius: "10px" }}
            >
              Создать игру
            </Link>
          )}
          <div ref={dropdownRef} style={{ position: "relative" }}>
            {/* Avatar button */}
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              style={{
                width:        "40px",
                height:       "40px",
                borderRadius: "50%",
                background:   "var(--primary)",
                border:       "none",
                cursor:       "pointer",
                display:      "flex",
                alignItems:   "center",
                justifyContent: "center",
                fontFamily:   "var(--font-ui)",
                fontWeight:   700,
                fontSize:     "16px",
                color:        "#ffffff",
                userSelect:   "none",
                flexShrink:   0,
              }}
              title={user.name}
            >
              {initial}
            </button>

            {/* Dropdown */}
            {open && (
              <div
                style={{
                  position:     "absolute",
                  top:          "calc(100% + 8px)",
                  right:        0,
                  background:   "#ffffff",
                  borderRadius: "var(--radius-sm, 8px)",
                  boxShadow:    "0 4px 16px rgba(0,0,0,0.12)",
                  border:       "1px solid rgba(0,0,0,0.06)",
                  minWidth:     "180px",
                  padding:      "6px",
                  zIndex:       200,
                }}
              >
                <p
                  style={{
                    margin:     "0 0 4px",
                    padding:    "6px 10px",
                    fontSize:   "13px",
                    color:      "var(--muted)",
                    fontFamily: "var(--font-ui)",
                    borderBottom: "1px solid rgba(0,0,0,0.06)",
                    marginBottom: "6px",
                    overflow:    "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace:  "nowrap",
                  }}
                >
                  {user.name}
                </p>
                <button
                  type="button"
                  onClick={handleProfile}
                  style={{
                    width:        "100%",
                    padding:      "8px 10px",
                    border:       "none",
                    borderRadius: "6px",
                    background:   pathname === "/profile" ? "#f1f5f9" : "none",
                    cursor:       "pointer",
                    fontFamily:   "var(--font-ui)",
                    fontSize:     "14px",
                    fontWeight:   600,
                    color:        "var(--foreground)",
                    textAlign:    "left",
                    transition:   "background 0.12s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = pathname === "/profile" ? "#f1f5f9" : "none")}
                >
                  Профиль
                </button>
                <div style={{ height: "1px", background: "rgba(0,0,0,0.06)", margin: "4px 0" }} />
                <button
                  type="button"
                  onClick={handleLogout}
                  style={{
                    width:        "100%",
                    padding:      "8px 10px",
                    border:       "none",
                    borderRadius: "6px",
                    background:   "none",
                    cursor:       "pointer",
                    fontFamily:   "var(--font-ui)",
                    fontSize:     "14px",
                    fontWeight:   600,
                    color:        "var(--error, #dc2626)",
                    textAlign:    "left",
                    transition:   "background 0.12s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--error-soft, #fef2f2)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                >
                  Выйти
                </button>
              </div>
            )}
          </div>
          </>
        ) : (
          <>
            <Link href="/login" className="btn btn-ghost" style={{ fontSize: "15px", padding: "10px 16px", minHeight: "40px" }}>
              Войти
            </Link>
            <Link href="/register" className="btn btn-primary" style={{ fontSize: "15px", padding: "10px 20px", minHeight: "40px", borderRadius: "10px" }}>
              Зарегистрироваться
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
