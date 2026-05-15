import { NextRequest, NextResponse } from "next/server";
import { COMANDA_SYNC_VERSION, comandaSyncBodySchema, syncComandaFromExcel } from "@/lib/comandes-sync";
import { isMobileApiAuthorized } from "@/lib/mobile-api";

export const dynamic = "force-dynamic";

/** Comprueba que el servidor tiene el código nuevo (debe devolver syncVersion: 3). */
export async function GET() {
  return NextResponse.json({
    ok: true,
    syncVersion: COMANDA_SYNC_VERSION,
    method: "POST con Authorization: Bearer <MOBILE_API_KEY>",
  });
}

/**
 * Sincroniza una comanda (líneas desde Excel) en la BD del portal.
 * Misma lógica que el importador local: UPSERT + borrar líneas que ya no están en el Excel.
 *
 * POST /api/mobile/comandas/sync
 * Authorization: Bearer <MOBILE_API_KEY>
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

  const parsed = comandaSyncBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Cuerpo inválido: numComanda y filas obligatorias" }, { status: 400 });
  }

  try {
    const result = await syncComandaFromExcel(
      parsed.data.numComanda,
      parsed.data.rows,
      parsed.data.syncDelete,
    );
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al sincronizar comanda";
    console.error("[comandas/sync]", msg, e);
    return NextResponse.json(
      { error: msg, syncVersion: COMANDA_SYNC_VERSION, hint: "Si syncVersion no es 5, redeploy del portal" },
      { status: 500 },
    );
  }
}
