import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyJWT } from "@/lib/jwt";

function err(status: number, error: string, message: string) {
  return NextResponse.json({ error, message }, { status });
}

function getMe(req: NextRequest): { sub: number } | null {
  const auth  = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;
  return verifyJWT<{ sub: number }>(token);
}

// POST /api/games/:id/participate — join the game (main list or waitlist)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const me = getMe(req);
    if (!me) return err(401, "UNAUTHORIZED", "Необходима авторизация");

    const { id } = await params;
    const gameId = parseInt(id, 10);
    if (isNaN(gameId)) return err(400, "VALIDATION_ERROR", "Некорректный id игры");

    const game = await prisma.game.findUnique({ where: { id: gameId } });
    if (!game)                      return err(404, "NOT_FOUND", "Игра не найдена");
    if (game.status !== "upcoming") return err(409, "CONFLICT",  "Нельзя записаться в завершённую или отменённую игру");
    if (game.createdById === me.sub) return err(403, "FORBIDDEN", "Создатель уже является участником");

    // Check if already participating
    const existing = await prisma.gameParticipant.findUnique({
      where: { gameId_userId: { gameId, userId: me.sub } },
    });
    if (existing) return err(409, "ALREADY_JOINED", "Вы уже участвуете в этой игре");

    // Count current main-list participants
    const confirmedCount = await prisma.gameParticipant.count({
      where: { gameId, isWaitlist: false },
    });

    const isWaitlist = confirmedCount >= game.minPlayers;

    const participant = await prisma.gameParticipant.create({
      data: { gameId, userId: me.sub, isWaitlist },
    });

    return NextResponse.json(participant, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[POST /api/games/[id]/participate]", msg);
    return err(500, "INTERNAL_ERROR", process.env.NODE_ENV === "development" ? msg : "Внутренняя ошибка сервера");
  }
}

// DELETE /api/games/:id/participate — leave the game; promotes first waitlist member if needed
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const me = getMe(req);
    if (!me) return err(401, "UNAUTHORIZED", "Необходима авторизация");

    const { id } = await params;
    const gameId = parseInt(id, 10);
    if (isNaN(gameId)) return err(400, "VALIDATION_ERROR", "Некорректный id игры");

    const game = await prisma.game.findUnique({ where: { id: gameId } });
    if (!game)                       return err(404, "NOT_FOUND", "Игра не найдена");
    if (game.createdById === me.sub)  return err(403, "FORBIDDEN", "Создатель не может покинуть игру");

    const participant = await prisma.gameParticipant.findUnique({
      where: { gameId_userId: { gameId, userId: me.sub } },
    });
    if (!participant) return err(404, "NOT_FOUND", "Вы не являетесь участником этой игры");

    if (!participant.isWaitlist) {
      // User was in main list — delete and promote first waitlist member (FIFO)
      await prisma.$transaction(async (tx) => {
        await tx.gameParticipant.delete({
          where: { gameId_userId: { gameId, userId: me.sub } },
        });

        const next = await tx.gameParticipant.findFirst({
          where:   { gameId, isWaitlist: true },
          orderBy: { createdAt: "asc" },
        });

        if (next) {
          await tx.gameParticipant.update({
            where: { id: next.id },
            data:  { isWaitlist: false },
          });
        }
      });
    } else {
      // User was on waitlist — just remove
      await prisma.gameParticipant.delete({
        where: { gameId_userId: { gameId, userId: me.sub } },
      });
    }

    return new NextResponse(null, { status: 204 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[DELETE /api/games/[id]/participate]", msg);
    return err(500, "INTERNAL_ERROR", process.env.NODE_ENV === "development" ? msg : "Внутренняя ошибка сервера");
  }
}
