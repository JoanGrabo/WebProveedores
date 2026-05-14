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
        return NextResponse.redirect(new URL("/comandas", request.url));
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
    "/comandas",
    "/comandas/:path*",
    "/comandes-origen",
    "/comandes-origen/:path*",
    "/admin",
    "/admin/:path*",
    "/api/comandes/:path*",
    "/api/admin/:path*",
  ],
};
