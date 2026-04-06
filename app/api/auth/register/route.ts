import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
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

    if (
      !body ||
      typeof body.email    !== "string" ||
      typeof body.password !== "string" ||
      typeof body.name     !== "string"
    ) {
      return err(400, "VALIDATION_ERROR", "Имя, email и пароль обязательны");
    }

    const email    = body.email.trim().toLowerCase();
    const password = body.password as string;
    const name     = body.name.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return err(400, "VALIDATION_ERROR", "Некорректный email");
    }
    if (password.length < 6) {
      return err(400, "VALIDATION_ERROR", "Пароль должен быть не менее 6 символов");
    }
    if (name.length < 2) {
      return err(400, "VALIDATION_ERROR", "Имя должно быть не менее 2 символов");
    }
    if (name.length > 50) {
      return err(400, "VALIDATION_ERROR", "Имя не должно превышать 50 символов");
    }

    const [existingEmail, existingName] = await Promise.all([
      prisma.user.findUnique({ where: { email } }),
      prisma.user.findUnique({ where: { name } }),
    ]);

    if (existingEmail) return err(409, "EMAIL_ALREADY_EXISTS",  "Пользователь с таким email уже существует");
    if (existingName)  return err(409, "NAME_ALREADY_EXISTS",   "Это имя уже занято, выберите другое");

    const user = await prisma.user.create({
      data: { email, password: hashPassword(password), name },
    });

    const accessToken       = signJWT({ sub: user.id, email: user.email }, ACCESS_TOKEN_TTL);
    const refreshTokenValue = randomBytes(40).toString("hex");

    await prisma.refreshToken.create({
      data: {
        token:     refreshTokenValue,
        userId:    user.id,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL * 1000),
      },
    });

    return NextResponse.json(
      {
        access_token:  accessToken,
        refresh_token: refreshTokenValue,
        user: { id: user.id, email: user.email, name: user.name, isAdmin: user.isAdmin, canCreateGame: user.canCreateGame },
      },
      { status: 201 },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[POST /api/auth/register]", msg);
    return err(500, "INTERNAL_ERROR", process.env.NODE_ENV === "development" ? msg : "Внутренняя ошибка сервера");
  }
}
