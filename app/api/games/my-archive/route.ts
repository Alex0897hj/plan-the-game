import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyJWT } from "@/lib/jwt";
import { minPlayersFromType } from "@/lib/game-types";

function err(status: number, error: string, message: string) {
  return NextResponse.json({ error, message }, { status });
}

// GET /api/games/my-archive — cancelled/completed/past games where the current user was a participant
export async function GET(req: NextRequest) {
  const auth  = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return err(401, "UNAUTHORIZED", "Необходима авторизация");

  const me = verifyJWT<{ sub: number }>(token);
  if (!me) return err(401, "UNAUTHORIZED", "Токен недействителен");

  const now = new Date();

  const participations = await prisma.gameParticipant.findMany({
    where: { userId: me.sub },
    select: {
      isWaitlist: true,
      game: {
        include: {
          createdBy:    { select: { id: true, email: true, name: true } },
          participants: { select: { userId: true, isWaitlist: true } },
        },
      },
    },
  });

  const result = participations
    .map(({ isWaitlist, game: g }) => ({
      g,
      myStatus: isWaitlist ? "waitlist" : "confirmed",
    }))
    .filter(({ g }) =>
      g.status === "cancelled" ||
      g.status === "completed"  ||
      new Date(g.gameDateTime) < now,
    )
    .sort((a, b) => new Date(b.g.gameDateTime).getTime() - new Date(a.g.gameDateTime).getTime())
    .map(({ g, myStatus }) => {
      const confirmedCount = g.participants.filter((p) => !p.isWaitlist).length;
      const waitlistCount  = g.participants.filter((p) =>  p.isWaitlist).length;
      const { participants, ...rest } = g;
      void participants;
      return {
        ...rest,
        minPlayers:     minPlayersFromType(g.gameType),
        confirmedCount,
        waitlistCount,
        myStatus,
        address: g.address ?? null,
      };
    });

  return NextResponse.json(result);
}
