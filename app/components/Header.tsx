import Link from "next/link";

export default function Header() {
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-black/[.08] dark:border-white/[.1]">
      <Link href="/" className="text-lg font-semibold tracking-tight">
        Plan the Game
      </Link>
      <div className="flex items-center gap-3">
        <Link
          href="/login"
          className="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-black/[.05] dark:hover:bg-white/[.08]"
        >
          Войти
        </Link>
        <Link
          href="/register"
          className="px-4 py-2 rounded-lg text-sm font-medium bg-foreground text-background transition-colors hover:opacity-90"
        >
          Зарегистрироваться
        </Link>
      </div>
    </header>
  );
}
