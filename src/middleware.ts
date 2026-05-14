import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionToken } from "@/lib/session-jwt";
import { SESSION_COOKIE } from "@/lib/auth-constants";

function redirectLogin(request: NextRequest) {
  const u = new URL("/login", request.url);
  u.searchParams.set("from", request.nextUrl.pathname);
  return NextResponse.redirect(u);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  /** Login: público; si ya hay sesión válida, al panel. */
  if (pathname === "/login" || pathname.startsWith("/login/")) {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    if (token) {
      try {
        const claims = await verifySessionToken(token);
        if (claims) {
          return NextResponse.redirect(new URL("/dashboard", request.url));
        }
      } catch {
        // cookie inválida: deja entrar al formulario de login
      }
    }
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;

  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    return redirectLogin(request);
  }

  try {
    const claims = await verifySessionToken(token);
    if (!claims) {
      throw new Error("invalid");
    }

    /** Raíz: siempre al hub autenticado. */
    if (pathname === "/") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    if (
      pathname.startsWith("/comandes-origen") ||
      pathname.startsWith("/api/comandes/recibir") ||
      pathname.startsWith("/admin") ||
      pathname.startsWith("/api/admin")
    ) {
      if (claims.rol !== "ADMIN") {
        if (pathname.startsWith("/api/")) {
          return NextResponse.json({ error: "Solo administradores" }, { status: 403 });
        }
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }

    return NextResponse.next();
  } catch {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Sesión inválida o caducada" }, { status: 401 });
    }
    return redirectLogin(request);
  }
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/login/:path*",
    "/dashboard",
    "/dashboard/:path*",
    "/comandas",
    "/comandas/:path*",
    "/comandes-origen",
    "/comandes-origen/:path*",
    "/admin",
    "/admin/:path*",
    "/api/auth/me",
    "/api/comandes/:path*",
    "/api/admin/:path*",
    "/api/health",
  ],
};
