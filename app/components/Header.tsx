import Link from "next/link";

export default function Header() {
  return (
    <header
      style={{
        display:         "flex",
        alignItems:      "center",
        justifyContent:  "space-between",
        padding:         "0 24px",
        height:          "72px",
        background:      "#ffffff",
        boxShadow:       "0 1px 0 rgba(0,0,0,0.06)",
        position:        "sticky",
        top:             0,
        zIndex:          100,
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
        <Link href="/login" className="btn btn-ghost" style={{ fontSize: "15px", padding: "10px 16px", minHeight: "40px" }}>
          Войти
        </Link>
        <Link href="/register" className="btn btn-primary" style={{ fontSize: "15px", padding: "10px 20px", minHeight: "40px", borderRadius: "10px" }}>
          Зарегистрироваться
        </Link>
      </nav>
    </header>
  );
}
