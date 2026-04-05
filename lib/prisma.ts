import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

function createClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error"] : ["error"],
  });
}

// Lazy getter: клиент создаётся при первом обращении, внутри try/catch в роуте
export function getPrisma(): PrismaClient {
  if (process.env.NODE_ENV === "production") {
    return createClient();
  }
  // Dev: переиспользуем между hot-reload'ами
  if (!global.__prisma) {
    global.__prisma = createClient();
  }
  return global.__prisma;
}
