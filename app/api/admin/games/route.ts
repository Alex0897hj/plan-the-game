import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyJWT } from "@/lib/jwt";
import { minPlayersFromType } from "@/lib/game-types";

function err(status: number, error: string, message: string) {
  return NextResponse.json({ error, message }, { status });
}

// GET /api/admin/games — all archived games (cancelled + past upcoming/completed)
// Only accessible by admins
export async function GET(req: NextRequest) {
  const auth  = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return err(401, "UNAUTHORIZED", "Необходима авторизация");

  const payload = verifyJWT<{ sub: number }>(token);
  if (!payload) return err(401, "UNAUTHORIZED", "Токен недействителен");

  const actor = await prisma.user.findUnique({ where: { id: payload.sub }, select: { isAdmin: true } });
  if (!actor?.isAdmin) return err(403, "FORBIDDEN", "Доступ запрещён");

  const now = new Date();

  const games = await prisma.game.findMany({
    where: {
      OR: [
        { status: "cancelled" },
        { gameDateTime: { lt: now } },
      ],
    },
    orderBy: { gameDateTime: "desc" },
    include: {
      createdBy:    { select: { id: true, email: true, name: true } },
      participants: { select: { userId: true, isWaitlist: true } },
    },
  });

  const result = games.map((g) => {
    const confirmedCount = g.participants.filter((p) => !p.isWaitlist).length;
    const waitlistCount  = g.participants.filter((p) =>  p.isWaitlist).length;
    const { participants, ...rest } = g;
    void participants;
    return { ...rest, minPlayers: minPlayersFromType(g.gameType), confirmedCount, waitlistCount, myStatus: null, address: g.address ?? null };
  });

  return NextResponse.json(result);
}
