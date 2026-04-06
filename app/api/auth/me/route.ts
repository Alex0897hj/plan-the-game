import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyJWT } from "@/lib/jwt";
import { hashPassword, verifyPassword } from "@/lib/password";

function err(status: number, error: string, message: string) {
  return NextResponse.json({ error, message }, { status });
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return err(401, "MISSING_TOKEN", "Требуется авторизация");
    }

    const payload = verifyJWT<{ sub: number }>(authHeader.slice(7));
    if (!payload) {
      return err(401, "INVALID_TOKEN", "Токен недействителен или истёк");
    }

    const user = await prisma.user.findUnique({
      where:  { id: payload.sub },
      select: { id: true, email: true, name: true, isAdmin: true, canCreateGame: true, telegram: true },
    });

    if (!user) {
      return err(401, "INVALID_TOKEN", "Пользователь не найден");
    }

    return NextResponse.json(user);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[GET /api/auth/me]", msg);
    return err(500, "INTERNAL_ERROR", process.env.NODE_ENV === "development" ? msg : "Внутренняя ошибка сервера");
  }
}

// PATCH /api/auth/me — update telegram and/or password
export async function PATCH(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return err(401, "MISSING_TOKEN", "Требуется авторизация");

    const payload = verifyJWT<{ sub: number }>(authHeader.slice(7));
    if (!payload) return err(401, "INVALID_TOKEN", "Токен недействителен или истёк");

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return err(400, "VALIDATION_ERROR", "Некорректный запрос");

    const { telegram, currentPassword, newPassword } = body as Record<string, unknown>;

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) return err(401, "INVALID_TOKEN", "Пользователь не найден");

    const data: Record<string, unknown> = {};

    // Telegram: allow empty string to clear, or a non-empty string
    if ("telegram" in body) {
      if (telegram !== null && telegram !== undefined && typeof telegram !== "string")
        return err(400, "VALIDATION_ERROR", "Некорректное значение telegram");
      const val = typeof telegram === "string" ? telegram.trim() : null;
      data.telegram = val || null;
    }

    // Password change
    if (newPassword !== undefined) {
      if (typeof currentPassword !== "string" || !currentPassword)
        return err(400, "VALIDATION_ERROR", "Укажите текущий пароль");
      if (typeof newPassword !== "string" || newPassword.length < 6)
        return err(400, "VALIDATION_ERROR", "Новый пароль должен содержать не менее 6 символов");
      if (!verifyPassword(currentPassword, user.password))
        return err(403, "WRONG_PASSWORD", "Текущий пароль неверен");
      data.password = hashPassword(newPassword);
    }

    if (Object.keys(data).length === 0)
      return err(400, "VALIDATION_ERROR", "Нет данных для обновления");

    const updated = await prisma.user.update({
      where:  { id: payload.sub },
      data,
      select: { id: true, email: true, name: true, isAdmin: true, canCreateGame: true, telegram: true },
    });

    return NextResponse.json(updated);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[PATCH /api/auth/me]", msg);
    return err(500, "INTERNAL_ERROR", process.env.NODE_ENV === "development" ? msg : "Внутренняя ошибка сервера");
  }
}
