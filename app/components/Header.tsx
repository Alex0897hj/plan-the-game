import Link from "next/link";

export default function Header() {
  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-black/[.08] dark:border-white/[.1]">
      <Link
        href="/"
        style={{
          fontFamily: "var(--font-ui)",
          fontWeight: 700,
          fontSize: "18px",
          letterSpacing: "-0.3px",
          color: "var(--primary)",
          textDecoration: "none",
        }}
      >
        Plan the Game
      </Link>
      <div className="flex items-center gap-2">
        <Link href="/login" className="btn btn-outline">
          Войти
        </Link>
        <Link href="/register" className="btn btn-primary">
          Зарегистрироваться
        </Link>
      </div>
    </header>
  );
}
