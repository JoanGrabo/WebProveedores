/**
 * Cliente HTTP para replicar en la VPS lo que el importador Excel ya guardó en MySQL local.
 *
 * En el .env del importador (junto a DB_HOST, etc.):
 *   VPS_API_URL=http://TU_IP_VPS:3000
 *   MOBILE_API_KEY=la_misma_clave_que_en_el_.env_de_la_VPS
 *
 * Uso en tu script, después de upsertAndSync:
 *   import { syncComandasToVps } from "./sync-comandas-vps.mjs";
 *   await syncComandasToVps(rows, fileName);
 */

export async function syncComandasToVps(rows, fileName) {
  const base = process.env.VPS_API_URL?.replace(/\/$/, "");
  const key = process.env.MOBILE_API_KEY?.trim();

  if (!base || !key) {
    console.warn("[VPS] Omitido: define VPS_API_URL y MOBILE_API_KEY en .env");
    return { skipped: true };
  }

  if (!rows?.length) {
    return { skipped: true, reason: "sin filas" };
  }

  const numComanda = rows[0].numComanda;
  const url = `${base}/api/mobile/comandas/sync`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      numComanda,
      rows,
      syncDelete: true,
    }),
  });

  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text };
  }

  if (!res.ok) {
    throw new Error(`[VPS] ${fileName} HTTP ${res.status}: ${body.error ?? text}`);
  }

  console.log(`[VPS OK] ${fileName}: comanda ${numComanda} (${body.lineas ?? rows.length} líneas)`);
  return body;
}
