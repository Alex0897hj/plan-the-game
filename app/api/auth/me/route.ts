import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyJWT } from "@/lib/jwt";

function err(status: number, error: string, message: string) {
  return NextResponse.json({ error, message }, { status });
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return err(401, "MISSING_TOKEN", "Требуется авторизация");
  }

  const token = authHeader.slice(7);
  const payload = verifyJWT<{ sub: number }>(token);

  if (!payload) {
    return err(401, "INVALID_TOKEN", "Токен недействителен или истёк");
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, email: true },
  });

  if (!user) {
    return err(401, "INVALID_TOKEN", "Пользователь не найден");
  }

  return NextResponse.json(user);
}
