import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyJWT } from "@/lib/jwt";

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

    const confirmed = game.participants.filter((p) => p.status === "confirmed");
    const thinking  = game.participants.filter((p) => p.status === "thinking");
    const myStatus  = me
      ? (game.participants.find((p) => p.userId === me.sub)?.status ?? null)
      : null;

    return NextResponse.json({
      ...game,
      confirmedCount: confirmed.length,
      thinkingCount:  thinking.length,
      confirmedList:  confirmed.map((p) => p.user),
      thinkingList:   thinking.map((p) => p.user),
      myStatus,
      participants:   undefined,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[GET /api/games/[id]]", msg);
    return err(500, "INTERNAL_ERROR", process.env.NODE_ENV === "development" ? msg : "Внутренняя ошибка сервера");
  }
}
