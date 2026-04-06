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

// PATCH /api/admin/users/:id — update isBlocked, canCreateGame, email, name
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin(req);
  if (!admin) return err(403, "FORBIDDEN", "Доступ запрещён");

  const { id } = await params;
  const userId = parseInt(id, 10);
  if (isNaN(userId)) return err(400, "VALIDATION_ERROR", "Некорректный id");

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return err(404, "NOT_FOUND", "Пользователь не найден");

  // Superadmin cannot be blocked or stripped of privileges via this endpoint
  if (target.isAdmin) return err(403, "FORBIDDEN", "Нельзя изменять другого администратора");

  const body = await req.json().catch(() => null);
  if (!body) return err(400, "VALIDATION_ERROR", "Тело запроса обязательно");

  const data: Record<string, unknown> = {};

  if (typeof body.isBlocked === "boolean")     data.isBlocked     = body.isBlocked;
  if (typeof body.canCreateGame === "boolean")  data.canCreateGame = body.canCreateGame;

  if (typeof body.email === "string") {
    const email = body.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return err(400, "VALIDATION_ERROR", "Некорректный email");
    const conflict = await prisma.user.findUnique({ where: { email } });
    if (conflict && conflict.id !== userId) return err(409, "EMAIL_ALREADY_EXISTS", "Email уже занят");
    data.email = email;
  }

  if (typeof body.name === "string") {
    const name = body.name.trim();
    if (name.length < 2)  return err(400, "VALIDATION_ERROR", "Имя не менее 2 символов");
    if (name.length > 50) return err(400, "VALIDATION_ERROR", "Имя не более 50 символов");
    const conflict = await prisma.user.findUnique({ where: { name } });
    if (conflict && conflict.id !== userId) return err(409, "NAME_ALREADY_EXISTS", "Имя уже занято");
    data.name = name;
  }

  if (Object.keys(data).length === 0) return err(400, "VALIDATION_ERROR", "Нет полей для обновления");

  const updated = await prisma.user.update({
    where: { id: userId },
    data,
    select: { id: true, email: true, name: true, isBlocked: true, canCreateGame: true, createdAt: true },
  });

  return NextResponse.json(updated);
}
