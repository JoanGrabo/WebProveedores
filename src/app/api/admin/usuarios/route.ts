import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma, Rol } from "@prisma/client";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  nombre: z.string().min(1).max(200),
  email: z.string().email().trim().toLowerCase(),
  password: z.string().min(8).max(200),
  rol: z.nativeEnum(Rol),
  proveedor: z.string().max(255).optional().nullable(),
});

function trimProv(p: string | null | undefined): string | null {
  if (p == null) return null;
  const t = p.trim();
  return t.length ? t : null;
}

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (user.rol !== Rol.ADMIN) return NextResponse.json({ error: "Solo administradores" }, { status: 403 });

  const usuarios = await prisma.usuario.findMany({
    select: { id: true, email: true, nombre: true, rol: true, proveedor: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ usuarios });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (user.rol !== Rol.ADMIN) return NextResponse.json({ error: "Solo administradores" }, { status: 403 });

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Nombre, email válido y contraseña (mín. 8 caracteres) son obligatorios" }, { status: 400 });
  }

  const { nombre, email, password, rol, proveedor } = parsed.data;
  const pv = trimProv(proveedor ?? null);
  if (rol === Rol.PROVEEDOR && !pv) {
    return NextResponse.json({ error: "Los usuarios proveedor deben tener el nombre de proveedor (como en comandes)" }, { status: 400 });
  }

  const hash = await bcrypt.hash(password, 10);
  try {
    const created = await prisma.usuario.create({
      data: {
        nombre,
        email,
        password: hash,
        rol,
        proveedor: rol === Rol.PROVEEDOR ? pv : null,
      },
      select: { id: true, email: true, nombre: true, rol: true, proveedor: true, createdAt: true },
    });
    return NextResponse.json({ usuario: created });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "Ese email ya está registrado" }, { status: 409 });
    }
    const msg = e instanceof Error ? e.message : "Error al crear usuario";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
