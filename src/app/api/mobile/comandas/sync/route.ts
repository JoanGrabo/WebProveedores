import { NextRequest, NextResponse } from "next/server";
import { comandaSyncBodySchema, syncComandaFromExcel } from "@/lib/comandes-sync";
import { isMobileApiAuthorized } from "@/lib/mobile-api";

export const dynamic = "force-dynamic";

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
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
