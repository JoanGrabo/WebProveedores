import { jwtVerify, SignJWT } from "jose";
import { SESSION_MAX_AGE_SEC } from "@/lib/auth-constants";

export type SessionRol = "ADMIN" | "PROVEEDOR";

function getSecretKey(): Uint8Array {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 16) {
    throw new Error("JWT_SECRET debe existir y tener al menos 16 caracteres");
  }
  return new TextEncoder().encode(s);
}

export async function createSessionToken(user: {
  id: string;
  email: string;
  rol: SessionRol;
  proveedor: string | null;
}): Promise<string> {
  return new SignJWT({
    email: user.email,
    rol: user.rol,
    pv: user.proveedor ?? "",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SEC}s`)
    .sign(getSecretKey());
}

/** Verifica JWT (Edge / Node). No consulta BD. */
export async function verifySessionToken(token: string) {
  const { payload } = await jwtVerify(token, getSecretKey());
  const sub = typeof payload.sub === "string" ? payload.sub : null;
  const rol =
    payload.rol === "ADMIN" || payload.rol === "PROVEEDOR" ? (payload.rol as SessionRol) : null;
  if (!sub || !rol) return null;
  return {
    sub,
    email: typeof payload.email === "string" ? payload.email : "",
    rol,
    proveedor: typeof payload.pv === "string" && payload.pv.length > 0 ? payload.pv : null,
  };
}
