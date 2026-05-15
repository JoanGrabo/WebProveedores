import type { NextRequest } from "next/server";

/** Clave compartida con la app Android (header Authorization: Bearer …). */
export function isMobileApiAuthorized(req: NextRequest): boolean {
  const expected = process.env.MOBILE_API_KEY?.trim();
  if (!expected) return false;

  const bearer = req.headers.get("authorization");
  if (bearer?.startsWith("Bearer ")) {
    return bearer.slice(7).trim() === expected;
  }

  const apiKey = req.headers.get("x-api-key");
  return apiKey?.trim() === expected;
}
