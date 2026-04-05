import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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

    if (!body || typeof body.refresh_token !== "string") {
      return err(400, "VALIDATION_ERROR", "Поле refresh_token обязательно");
    }

    const stored = await prisma.refreshToken.findUnique({
      where:   { token: body.refresh_token },
      include: { user: true },
    });

    if (!stored || stored.expiresAt < new Date()) {
      return err(401, "INVALID_REFRESH_TOKEN", "Токен недействителен или истёк");
    }

    await prisma.refreshToken.delete({ where: { id: stored.id } });

    const { user }          = stored;
    const accessToken       = signJWT({ sub: user.id, email: user.email }, ACCESS_TOKEN_TTL);
    const newRefreshToken   = randomBytes(40).toString("hex");

    await prisma.refreshToken.create({
      data: {
        token:     newRefreshToken,
        userId:    user.id,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL * 1000),
      },
    });

    return NextResponse.json({ access_token: accessToken, refresh_token: newRefreshToken });
  } catch (e) {
    console.error("[POST /api/auth/refresh]", e);
    return err(500, "INTERNAL_ERROR", "Внутренняя ошибка сервера");
  }
}
