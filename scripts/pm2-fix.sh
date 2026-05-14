#!/usr/bin/env bash
# Reinicia PM2 de forma limpia (libera puerto, borra proceso colgado, arranca de nuevo).
# Úsalo cuando web-proveedores quede en "errored" o tras un build.
# Ejecutar desde cualquier sitio:
#   bash /ruta/al/repo/scripts/pm2-fix.sh
# O desde la raíz del repo:
#   chmod +x scripts/pm2-fix.sh && ./scripts/pm2-fix.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")/.." && pwd)"
cd "$ROOT"

PORT="${PORT:-3000}"
if [ -f .env ]; then
  # PORT=3000 o PORT="3000" (sin ejecutar todo .env por DATABASE_URL con caracteres raros)
  line="$(grep -E '^[[:space:]]*PORT=' .env | tail -n1 || true)"
  if [ -n "$line" ]; then
    val="${line#*=}"
    val="${val%\"}"
    val="${val#\"}"
    val="${val%%[[:space:]]*}"
    if [[ "$val" =~ ^[0-9]+$ ]]; then
      PORT="$val"
    fi
  fi
fi

echo "==> Proyecto: $ROOT"
echo "==> Puerto interno esperado: $PORT"

if command -v ss >/dev/null 2>&1; then
  if ss -tlnp 2>/dev/null | grep -qE ":${PORT}[[:space:]]"; then
    echo "==> Hay algo escuchando en :$PORT — intentando liberar (fuser)…"
    if command -v fuser >/dev/null 2>&1; then
      fuser -k "${PORT}/tcp" 2>/dev/null || sudo fuser -k "${PORT}/tcp" 2>/dev/null || true
    else
      echo "    (instala psmisc para fuser, o mata el proceso a mano con: sudo lsof -i :$PORT)"
    fi
    sleep 2
  fi
fi

# Misma lógica que vps-build: si build fue como root y la carpeta es de otro usuario
if [ "$(id -u)" -eq 0 ]; then
  owner="$(stat -c "%U" . 2>/dev/null || true)"
  if [ -n "${owner:-}" ] && [ "$owner" != "root" ]; then
    echo "==> Permisos: chown -R $owner:$owner (evita .next ilegible para PM2 no-root)"
    chown -R "$owner:$owner" .
  fi
fi

echo "==> PM2: eliminar proceso antiguo (si existe)"
pm2 delete web-proveedores 2>/dev/null || true

echo "==> PM2: arrancar desde ecosystem.config.cjs"
pm2 start ecosystem.config.cjs
pm2 save

echo "==> Esperando arranque…"
sleep 3

echo "==> Estado PM2:"
pm2 ls || true

echo "==> Health local:"
if curl -sf "http://127.0.0.1:${PORT}/api/health" | head -c 200; then
  echo ""
  echo "OK — la app responde en http://127.0.0.1:${PORT}/api/health"
else
  echo ""
  echo "!! No hubo respuesta correcta en /api/health. Revisa:"
  echo "   pm2 logs web-proveedores --lines 40 --nostream"
  exit 1
fi
