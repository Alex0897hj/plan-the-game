import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyJWT } from "@/lib/jwt";

function err(status: number, error: string, message: string) {
  return NextResponse.json({ error, message }, { status });
}

// GET /api/games/:id/chat — load message history (confirmed participants only)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth  = req.headers.get("authorization") ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) return err(401, "UNAUTHORIZED", "Необходима авторизация");

    const me = verifyJWT<{ sub: number }>(token);
    if (!me) return err(401, "UNAUTHORIZED", "Токен недействителен");

    const { id } = await params;
    const gameId = parseInt(id, 10);
    if (isNaN(gameId)) return err(400, "VALIDATION_ERROR", "Некорректный id");

    const [game, participant, user] = await Promise.all([
      prisma.game.findUnique({ where: { id: gameId }, select: { status: true } }),
      prisma.gameParticipant.findUnique({
        where: { gameId_userId: { gameId, userId: me.sub } },
      }),
      prisma.user.findUnique({ where: { id: me.sub }, select: { isBlocked: true } }),
    ]);

    if (!game)                              return err(404, "NOT_FOUND", "Игра не найдена");
    if (game.status === "cancelled")        return err(403, "FORBIDDEN", "Чат недоступен для отменённых игр");
    if (!participant || participant.isWaitlist) return err(403, "FORBIDDEN", "Чат доступен только участникам игры");
    if (user?.isBlocked)                    return err(403, "FORBIDDEN", "Аккаунт заблокирован");

    const messages = await prisma.chatMessage.findMany({
      where:   { gameId },
      orderBy: { createdAt: "asc" },
      take:    100,
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    return NextResponse.json(messages);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[GET /api/games/[id]/chat]", msg);
    return err(500, "INTERNAL_ERROR", process.env.NODE_ENV === "development" ? msg : "Внутренняя ошибка сервера");
  }
}
