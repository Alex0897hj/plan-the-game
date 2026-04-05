import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { signJWT } from "@/lib/jwt";
import { randomBytes } from "node:crypto";

const ACCESS_TOKEN_TTL  = 15 * 60;
const REFRESH_TOKEN_TTL = 7 * 24 * 3600;

function err(status: number, error: string, message: string) {
  return NextResponse.json({ error, message }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    if (!body || typeof body.email !== "string" || typeof body.password !== "string") {
      return err(400, "VALIDATION_ERROR", "Email и пароль обязательны");
    }

    const email    = body.email.trim().toLowerCase();
    const password = body.password as string;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password) {
      return err(400, "VALIDATION_ERROR", "Некорректный email или пустой пароль");
    }

    const prisma = getPrisma();

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !verifyPassword(password, user.password)) {
      return err(401, "INVALID_CREDENTIALS", "Неверный email или пароль");
    }

    const accessToken       = signJWT({ sub: user.id, email: user.email }, ACCESS_TOKEN_TTL);
    const refreshTokenValue = randomBytes(40).toString("hex");

    await prisma.refreshToken.create({
      data: {
        token:     refreshTokenValue,
        userId:    user.id,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL * 1000),
      },
    });

    return NextResponse.json({
      access_token:  accessToken,
      refresh_token: refreshTokenValue,
      user: { id: user.id, email: user.email },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[POST /api/auth/login]", msg);
    return err(500, "INTERNAL_ERROR", process.env.NODE_ENV === "development" ? msg : "Внутренняя ошибка сервера");
  }
}
