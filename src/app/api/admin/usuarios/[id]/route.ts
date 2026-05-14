import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma, Rol } from "@prisma/client";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const usuarioAccesoPatch = z
  .string()
  .min(3)
  .max(64)
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/, "Solo letras, números, _ y - (no empezar por esos)")
  .transform((s) => s.toLowerCase());

const patchSchema = z.object({
  nombre: z.string().min(1).max(200).optional(),
  usuario: usuarioAccesoPatch.optional(),
  password: z.string().min(8).max(200).optional(),
  rol: z.nativeEnum(Rol).optional(),
  proveedor: z.string().max(255).nullable().optional(),
});

function trimProv(p: string | null | undefined): string | null {
  if (p == null) return null;
  const t = p.trim();
  return t.length ? t : null;
}

type RouteCtx = { params: { id: string } };

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (user.rol !== Rol.ADMIN) return NextResponse.json({ error: "Solo administradores" }, { status: 403 });

  const id = ctx.params.id;
  if (!id) return NextResponse.json({ error: "Id inválido" }, { status: 400 });

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const existing = await prisma.usuario.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  const nextRol = parsed.data.rol ?? existing.rol;
  const nextProveedor =
    parsed.data.proveedor !== undefined ? trimProv(parsed.data.proveedor) : trimProv(existing.proveedor);

  if (nextRol === Rol.PROVEEDOR && !nextProveedor) {
    return NextResponse.json({ error: "Los proveedores deben tener nombre de proveedor" }, { status: 400 });
  }

  if (existing.rol === Rol.ADMIN && nextRol === Rol.PROVEEDOR) {
    const admins = await prisma.usuario.count({ where: { rol: Rol.ADMIN } });
    if (admins <= 1) {
      return NextResponse.json({ error: "No puedes quitar el único administrador del sistema" }, { status: 400 });
    }
  }

  const data: {
    nombre?: string;
    usuario?: string;
    password?: string;
    rol?: Rol;
    proveedor?: string | null;
  } = {};

  if (parsed.data.nombre !== undefined) data.nombre = parsed.data.nombre;
  if (parsed.data.usuario !== undefined) data.usuario = parsed.data.usuario;
  if (parsed.data.rol !== undefined) data.rol = parsed.data.rol;
  if (parsed.data.password !== undefined && parsed.data.password.length > 0) {
    data.password = await bcrypt.hash(parsed.data.password, 10);
  }
  if (parsed.data.proveedor !== undefined || parsed.data.rol !== undefined) {
    data.proveedor = nextRol === Rol.PROVEEDOR ? nextProveedor : null;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
  }

  try {
    const updated = await prisma.usuario.update({
      where: { id },
      data,
      select: { id: true, email: true, usuario: true, nombre: true, rol: true, proveedor: true, createdAt: true },
    });

    return NextResponse.json({ usuario: updated });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "Ese nombre de usuario ya está en uso" }, { status: 409 });
    }
    throw e;
  }
}
