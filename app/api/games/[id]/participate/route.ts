import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyJWT } from "@/lib/jwt";

function err(status: number, error: string, message: string) {
  return NextResponse.json({ error, message }, { status });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = req.headers.get("authorization") ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) return err(401, "UNAUTHORIZED", "Необходима авторизация");

    const me = verifyJWT<{ sub: number }>(token);
    if (!me) return err(401, "UNAUTHORIZED", "Токен недействителен");

    const { id } = await params;
    const gameId = parseInt(id, 10);
    if (isNaN(gameId)) return err(400, "VALIDATION_ERROR", "Некорректный id игры");

    const body = await req.json().catch(() => null);
    const status = body?.status;
    if (status !== "confirmed" && status !== "thinking")
      return err(400, "VALIDATION_ERROR", "status должен быть confirmed или thinking");

    const game = await prisma.game.findUnique({ where: { id: gameId } });
    if (!game) return err(404, "NOT_FOUND", "Игра не найдена");

    const participant = await prisma.gameParticipant.upsert({
      where:  { gameId_userId: { gameId, userId: me.sub } },
      create: { gameId, userId: me.sub, status },
      update: { status },
    });

    return NextResponse.json(participant);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[POST /api/games/[id]/participate]", msg);
    return err(500, "INTERNAL_ERROR", process.env.NODE_ENV === "development" ? msg : "Внутренняя ошибка сервера");
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = req.headers.get("authorization") ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) return err(401, "UNAUTHORIZED", "Необходима авторизация");

    const me = verifyJWT<{ sub: number }>(token);
    if (!me) return err(401, "UNAUTHORIZED", "Токен недействителен");

    const { id } = await params;
    const gameId = parseInt(id, 10);
    if (isNaN(gameId)) return err(400, "VALIDATION_ERROR", "Некорректный id игры");

    await prisma.gameParticipant.deleteMany({
      where: { gameId, userId: me.sub },
    });

    return new NextResponse(null, { status: 204 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[DELETE /api/games/[id]/participate]", msg);
    return err(500, "INTERNAL_ERROR", process.env.NODE_ENV === "development" ? msg : "Внутренняя ошибка сервера");
  }
}
