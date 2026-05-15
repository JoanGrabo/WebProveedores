import { NextRequest, NextResponse } from "next/server";
import { createEntradaFromJson } from "@/lib/entradas-create";
import { isMobileApiAuthorized } from "@/lib/mobile-api";

export const dynamic = "force-dynamic";

/**
 * POST entradas desde app Android (sin cookie de sesión).
 * Header: Authorization: Bearer <MOBILE_API_KEY>
 * o X-API-Key: <MOBILE_API_KEY>
 */
export async function POST(req: NextRequest) {
  if (!isMobileApiAuthorized(req)) {
    return NextResponse.json({ error: "API key no válida o no configurada en el servidor" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  return createEntradaFromJson(json);
}
