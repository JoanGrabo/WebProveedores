import { NextRequest, NextResponse } from "next/server";
import { Rol } from "@prisma/client";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser(_req);
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (user.rol !== Rol.ADMIN) return NextResponse.json({ error: "Solo administradores" }, { status: 403 });

  const id = Number.parseInt(params.id, 10);
  if (!Number.isFinite(id) || id < 1) {
    return NextResponse.json({ error: "Identificador no válido" }, { status: 400 });
  }

  try {
    await prisma.entrada.delete({ where: { idEntrada: id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const code = typeof e === "object" && e !== null && "code" in e ? String((e as { code?: string }).code) : "";
    if (code === "P2025") {
      return NextResponse.json({ error: "Entrada no encontrada" }, { status: 404 });
    }
    return NextResponse.json({ error: "No se pudo eliminar" }, { status: 500 });
  }
}
