import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyJWT } from "@/lib/jwt";
import { GAME_TYPE_PLAYERS, minPlayersFromType } from "@/lib/game-types";

function err(status: number, error: string, message: string) {
  return NextResponse.json({ error, message }, { status });
}

function getUser(req: NextRequest): { sub: number; email: string } | null {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;
  return verifyJWT<{ sub: number; email: string }>(token);
}

export async function GET(req: NextRequest) {
  try {
    const me = getUser(req);

    const games = await prisma.game.findMany({
      where:   { status: { not: "cancelled" } },
      orderBy: { gameDateTime: "asc" },
      include: {
        createdBy:    { select: { id: true, email: true, name: true } },
        participants: { select: { userId: true, isWaitlist: true } },
      },
    });

    const result = games.map((g) => {
      const confirmedCount = g.participants.filter((p) => !p.isWaitlist).length;
      const waitlistCount  = g.participants.filter((p) =>  p.isWaitlist).length;
      const myParticipant  = me ? g.participants.find((p) => p.userId === me.sub) : undefined;
      const myStatus = myParticipant
        ? (myParticipant.isWaitlist ? "waitlist" : "confirmed")
        : null;

      const { participants, ...rest } = g;
      void participants;

      return { ...rest, minPlayers: minPlayersFromType(g.gameType), confirmedCount, waitlistCount, myStatus };
    });

    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[GET /api/games]", msg);
    return err(500, "INTERNAL_ERROR", process.env.NODE_ENV === "development" ? msg : "Внутренняя ошибка сервера");
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getUser(req);
    if (!user) return err(401, "UNAUTHORIZED", "Необходима авторизация");

    const dbUser = await prisma.user.findUnique({ where: { id: user.sub }, select: { isBlocked: true, canCreateGame: true } });
    if (!dbUser || dbUser.isBlocked)      return err(403, "ACCOUNT_BLOCKED",    "Ваш аккаунт заблокирован");
    if (!dbUser.canCreateGame)            return err(403, "GAMES_CREATION_FORBIDDEN", "Создание игр для вашего аккаунта отключено");

    const body = await req.json().catch(() => null);
    if (!body) return err(400, "VALIDATION_ERROR", "Тело запроса обязательно");

    const { title, description, city, gameDateTime, gameType, latitude, longitude, address } = body;

    if (!title || typeof title !== "string" || !title.trim())
      return err(400, "VALIDATION_ERROR", "Название обязательно");
    if (!description || typeof description !== "string" || !description.trim())
      return err(400, "VALIDATION_ERROR", "Описание обязательно");
    if (typeof city !== "string")
      return err(400, "VALIDATION_ERROR", "Некорректное значение города");
    if (!gameDateTime || isNaN(new Date(gameDateTime).getTime()))
      return err(400, "VALIDATION_ERROR", "Укажите корректную дату и время");
    if (!gameType || !(gameType in GAME_TYPE_PLAYERS))
      return err(400, "VALIDATION_ERROR", "Выберите формат игры");
    if (typeof latitude !== "number" || typeof longitude !== "number")
      return err(400, "VALIDATION_ERROR", "Отметьте место проведения на карте");

    const game = await prisma.game.create({
      data: {
        title:        title.trim(),
        description:  description.trim(),
        city:         city.trim(),
        gameDateTime: new Date(gameDateTime),
        gameType,
        latitude,
        longitude,
        address:      typeof address === "string" ? address.trim() : null,
        createdById:  user.sub,
        participants: {
          create: { userId: user.sub, isWaitlist: false },
        },
      },
    });

    return NextResponse.json({ ...game, minPlayers: minPlayersFromType(game.gameType) }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[POST /api/games]", msg);
    return err(500, "INTERNAL_ERROR", process.env.NODE_ENV === "development" ? msg : "Внутренняя ошибка сервера");
  }
}
