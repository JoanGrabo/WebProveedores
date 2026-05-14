import type { NextRequest } from "next/server";
import type { Rol } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE } from "@/lib/auth-constants";
import { verifySessionToken } from "@/lib/session-jwt";

export type SessionUser = {
  id: string;
  email: string;
  usuario: string | null;
  nombre: string;
  rol: Rol;
  proveedor: string | null;
};

/** Usuario actual desde cookie + BD (fuente de verdad del proveedor). */
export async function getSessionUser(req: NextRequest): Promise<SessionUser | null> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const claims = await verifySessionToken(token);
    if (!claims) return null;
    const user = await prisma.usuario.findUnique({
      where: { id: claims.sub },
      select: { id: true, email: true, usuario: true, nombre: true, rol: true, proveedor: true },
    });
    return user;
  } catch {
    return null;
  }
}
