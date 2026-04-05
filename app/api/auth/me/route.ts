import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { verifyJWT } from "@/lib/jwt";

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

    const prisma = getPrisma();

    const user = await prisma.user.findUnique({
      where:  { id: payload.sub },
      select: { id: true, email: true },
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
