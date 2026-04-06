// @ts-check
"use strict";

const { createServer } = require("node:http");
const { createHmac, timingSafeEqual } = require("node:crypto");
const next = require("next");
const { Server } = require("socket.io");

const port = parseInt(process.env.PORT || "3000", 10);
const dev  = process.env.NODE_ENV !== "production";

const app    = next({ dev });
const handle = app.getRequestHandler();

// JWT verification — mirrors lib/jwt.ts (same algorithm, same SECRET)
function b64url(buf) {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function verifyJWT(token) {
  try {
    const secret = process.env.JWT_SECRET ?? "change-me-in-production";
    const parts  = token.split(".");
    if (parts.length !== 3) return null;
    const [header, body, sig] = parts;
    const expected = b64url(createHmac("sha256", secret).update(`${header}.${body}`).digest());
    const sigBuf = Buffer.from(sig,      "base64");
    const expBuf = Buffer.from(expected, "base64");
    if (sigBuf.length !== expBuf.length) return null;
    if (!timingSafeEqual(sigBuf, expBuf)) return null;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString());
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

app.prepare().then(() => {
  // After prepare() Next.js has loaded .env* files into process.env
  const { PrismaClient } = require("@prisma/client");
  const { PrismaPg }     = require("@prisma/adapter-pg");

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma  = new PrismaClient({ adapter });

  const httpServer = createServer((req, res) => handle(req, res));

  const io = new Server(httpServer, {
    path: "/api/socket.io",
    cors: { origin: "*", methods: ["GET", "POST"] },
  });

  // ── Auth middleware ──────────────────────────────────────────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("UNAUTHORIZED"));
    const payload = verifyJWT(token);
    if (!payload) return next(new Error("UNAUTHORIZED"));
    socket.data.userId = payload.sub;
    next();
  });

  // ── Connection handler ───────────────────────────────────────────────────────
  io.on("connection", (socket) => {
    const userId = /** @type {number} */ (socket.data.userId);

    // ── join_game ──────────────────────────────────────────────────────────────
    socket.on("join_game", async ({ gameId }) => {
      try {
        const gid = parseInt(gameId, 10);
        if (isNaN(gid)) return;

        const [participant, game, user] = await Promise.all([
          prisma.gameParticipant.findUnique({
            where: { gameId_userId: { gameId: gid, userId } },
          }),
          prisma.game.findUnique({ where: { id: gid }, select: { status: true } }),
          prisma.user.findUnique({ where: { id: userId }, select: { isBlocked: true } }),
        ]);

        if (!participant || participant.isWaitlist || !game || user?.isBlocked) {
          socket.emit("chat_error", { code: "FORBIDDEN", message: "Нет доступа к чату" });
          return;
        }
        if (game.status === "cancelled") {
          socket.emit("chat_error", { code: "GAME_CANCELLED", message: "Игра отменена" });
          return;
        }

        socket.join(`game:${gid}`);
        socket.emit("joined_game", { gameId: gid });
      } catch (e) {
        console.error("[socket join_game]", e);
      }
    });

    // ── send_message ───────────────────────────────────────────────────────────
    socket.on("send_message", async ({ gameId, text }) => {
      try {
        const gid = parseInt(gameId, 10);
        if (isNaN(gid)) return;
        if (!text || typeof text !== "string") return;
        const trimmed = text.trim().slice(0, 500);
        if (!trimmed) return;

        // Fresh server-side access check on every message
        const [participant, game, user] = await Promise.all([
          prisma.gameParticipant.findUnique({
            where: { gameId_userId: { gameId: gid, userId } },
          }),
          prisma.game.findUnique({ where: { id: gid }, select: { status: true } }),
          prisma.user.findUnique({
            where: { id: userId },
            select: { isBlocked: true, name: true, email: true },
          }),
        ]);

        if (!participant || participant.isWaitlist) {
          socket.emit("chat_error", { code: "FORBIDDEN", message: "Нет доступа к чату" });
          return;
        }
        if (user?.isBlocked) {
          socket.emit("chat_error", { code: "BLOCKED", message: "Аккаунт заблокирован" });
          return;
        }
        if (!game || game.status !== "upcoming") {
          socket.emit("chat_error", { code: "GAME_INACTIVE", message: "Чат только для чтения" });
          return;
        }

        const msg = await prisma.chatMessage.create({
          data: { gameId: gid, userId, text: trimmed },
        });

        const message = {
          id:        msg.id,
          gameId:    gid,
          text:      trimmed,
          createdAt: msg.createdAt,
          user: {
            id:    userId,
            name:  user.name,
            email: user.email,
          },
        };

        // Broadcast to all sockets in this game's room
        io.to(`game:${gid}`).emit("new_message", message);
      } catch (e) {
        console.error("[socket send_message]", e);
      }
    });
  });

  httpServer.listen(port, () => {
    console.log(`> Ready on http://localhost:${port} [${dev ? "dev" : "production"}]`);
  });
});
