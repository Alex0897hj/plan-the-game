import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { signJWT } from "@/lib/jwt";
import { randomBytes } from "node:crypto";

const ACCESS_TOKEN_TTL = 15 * 60;        // 15 minutes
const REFRESH_TOKEN_TTL = 7 * 24 * 3600; // 7 days

function err(status: number, error: string, message: string) {
  return NextResponse.json({ error, message }, { status });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  if (!body || typeof body.email !== "string" || typeof body.password !== "string") {
    return err(400, "VALIDATION_ERROR", "Email и пароль обязательны");
  }

  const email = body.email.trim().toLowerCase();
  const { password } = body;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return err(400, "VALIDATION_ERROR", "Некорректный email");
  }
  if (password.length < 6) {
    return err(400, "VALIDATION_ERROR", "Пароль должен быть не менее 6 символов");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return err(409, "EMAIL_ALREADY_EXISTS", "Пользователь с таким email уже существует");
  }

  const hashedPassword = hashPassword(password);
  const user = await prisma.user.create({
    data: { email, password: hashedPassword },
  });

  const accessToken = signJWT({ sub: user.id, email: user.email }, ACCESS_TOKEN_TTL);
  const refreshTokenValue = randomBytes(40).toString("hex");
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL * 1000);

  await prisma.refreshToken.create({
    data: { token: refreshTokenValue, userId: user.id, expiresAt },
  });

  return NextResponse.json(
    {
      access_token: accessToken,
      refresh_token: refreshTokenValue,
      user: { id: user.id, email: user.email },
    },
    { status: 201 }
  );
}
