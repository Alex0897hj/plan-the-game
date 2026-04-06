import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyJWT } from "@/lib/jwt";
import { minPlayersFromType } from "@/lib/game-types";

function err(status: number, error: string, message: string) {
  return NextResponse.json({ error, message }, { status });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const gameId = parseInt(id, 10);
    if (isNaN(gameId)) return err(400, "VALIDATION_ERROR", "Некорректный id");

    const auth  = req.headers.get("authorization") ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    const me    = token ? verifyJWT<{ sub: number }>(token) : null;

    const game = await prisma.game.findUnique({
      where:   { id: gameId },
      include: {
        createdBy:    { select: { id: true, email: true, name: true } },
        participants: {
          include: { user: { select: { id: true, email: true, name: true } } },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!game) return err(404, "NOT_FOUND", "Игра не найдена");

    const confirmed = game.participants.filter((p) => !p.isWaitlist);
    const waitlist  = game.participants.filter((p) =>  p.isWaitlist);
    const myParticipant = me ? game.participants.find((p) => p.userId === me.sub) : undefined;
    const myStatus = myParticipant
      ? (myParticipant.isWaitlist ? "waitlist" : "confirmed")
      : null;

    return NextResponse.json({
      ...game,
      minPlayers:     minPlayersFromType(game.gameType),
      confirmedCount: confirmed.length,
      waitlistCount:  waitlist.length,
      confirmedList:  confirmed.map((p) => p.user),
      waitlist:       waitlist.map((p) => p.user),
      myStatus,
      participants:   undefined,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[GET /api/games/[id]]", msg);
    return err(500, "INTERNAL_ERROR", process.env.NODE_ENV === "development" ? msg : "Внутренняя ошибка сервера");
  }
}

export async function PATCH(
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

    const body = await req.json().catch(() => null);
    if (body?.status !== "cancelled")
      return err(400, "VALIDATION_ERROR", "Допустимое значение status: cancelled");

    const [game, actor] = await Promise.all([
      prisma.game.findUnique({ where: { id: gameId } }),
      prisma.user.findUnique({ where: { id: me.sub }, select: { isAdmin: true } }),
    ]);
    if (!game)                                              return err(404, "NOT_FOUND",  "Игра не найдена");
    if (!actor?.isAdmin && game.createdById !== me.sub)     return err(403, "FORBIDDEN",  "Только создатель может отменить игру");
    if (game.status !== "upcoming")                         return err(409, "CONFLICT",   "Можно отменить только предстоящую игру");

    const updated = await prisma.game.update({
      where: { id: gameId },
      data:  { status: "cancelled" },
    });

    return NextResponse.json(updated);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[PATCH /api/games/[id]]", msg);
    return err(500, "INTERNAL_ERROR", process.env.NODE_ENV === "development" ? msg : "Внутренняя ошибка сервера");
  }
}
