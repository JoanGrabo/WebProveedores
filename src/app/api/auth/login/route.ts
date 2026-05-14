import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { createSessionToken } from "@/lib/session-jwt";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE, SESSION_MAX_AGE_SEC, sessionCookieSecure } from "@/lib/auth-constants";

const bodySchema = z
  .object({
    password: z.string().min(1),
    /** Preferido: usuario o email en un solo campo */
    login: z.string().max(255).trim().optional(),
    /** Compatibilidad con versiones anteriores del cliente */
    email: z.string().email().trim().toLowerCase().optional(),
  })
  .transform((d) => {
    const raw = (d.login?.length ? d.login : d.email ?? "").trim();
    return { password: d.password, key: raw.toLowerCase() };
  })
  .pipe(
    z.object({
      password: z.string().min(1),
      key: z.string().min(1).max(255),
    }),
  );

export async function POST(req: NextRequest) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Usuario o contraseña no válidos" }, { status: 400 });
  }

  const { password } = parsed.data;
  const key = parsed.data.key;

  try {
    const user = await prisma.usuario.findFirst({
      where: {
        OR: [{ email: key }, { usuario: key }],
      },
    });
    if (!user) {
      return NextResponse.json({ error: "Credenciales incorrectas" }, { status: 401 });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return NextResponse.json({ error: "Credenciales incorrectas" }, { status: 401 });
    }

    const token = await createSessionToken({
      id: user.id,
      email: user.email,
      rol: user.rol,
      proveedor: user.proveedor,
    });

    const res = NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        usuario: user.usuario,
        nombre: user.nombre,
        rol: user.rol,
        proveedor: user.proveedor,
      },
    });

    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: sessionCookieSecure(),
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SEC,
    });

    return res;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al iniciar sesión";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
