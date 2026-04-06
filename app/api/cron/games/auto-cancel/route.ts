import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { minPlayersFromType } from "@/lib/game-types";

/**
 * GET /api/cron/games/auto-cancel
 *
 * Cancels upcoming games that are within 6 hours of their start time
 * and have fewer confirmed participants than minPlayers.
 *
 * Call this endpoint from an external cron scheduler (e.g. Vercel Cron,
 * GitHub Actions, or any HTTP cron service) every ~15 minutes.
 *
 * Optionally protect with a secret: set CRON_SECRET in env and pass it
 * as Authorization: Bearer <CRON_SECRET>.
 */
export async function GET(req: NextRequest) {
  // Optional secret check
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth  = req.headers.get("authorization") ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (token !== secret) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
  }

  try {
    const now        = new Date();
    const deadline   = new Date(now.getTime() + 6 * 60 * 60 * 1000); // now + 6h

    // Find all upcoming games whose start time is within the next 6 hours
    const candidates = await prisma.game.findMany({
      where: {
        status:       "upcoming",
        gameDateTime: { lte: deadline },
      },
      include: {
        _count: {
          select: { participants: { where: { isWaitlist: false } } },
        },
      },
    });

    const toCancel = candidates.filter(
      (g) => g._count.participants < minPlayersFromType(g.gameType),
    );

    if (toCancel.length === 0) {
      return NextResponse.json({ cancelled: 0 });
    }

    await prisma.game.updateMany({
      where: { id: { in: toCancel.map((g) => g.id) } },
      data:  { status: "cancelled" },
    });

    return NextResponse.json({
      cancelled: toCancel.length,
      ids:       toCancel.map((g) => g.id),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[GET /api/cron/games/auto-cancel]", msg);
    return NextResponse.json({ error: "INTERNAL_ERROR", message: msg }, { status: 500 });
  }
}
