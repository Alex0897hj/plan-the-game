import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyJWT } from "@/lib/jwt";

function err(status: number, error: string, message: string) {
  return NextResponse.json({ error, message }, { status });
}

async function requireAdmin(req: NextRequest) {
  const auth  = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;
  const payload = verifyJWT<{ sub: number }>(token);
  if (!payload) return null;
  const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: { id: true, isAdmin: true, isBlocked: true } });
  if (!user || !user.isAdmin || user.isBlocked) return null;
  return user;
}

// GET /api/admin/users — list all users
export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return err(403, "FORBIDDEN", "Доступ запрещён");

  const users = await prisma.user.findMany({
    select: {
      id:            true,
      email:         true,
      name:          true,
      isAdmin:       true,
      isBlocked:     true,
      canCreateGame: true,
      createdAt:     true,
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(users);
}
