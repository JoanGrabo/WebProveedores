#!/usr/bin/env bash
# Ejecutar en el VPS Ubuntu (puede llamarse desde cualquier sitio: hace cd al repo).
# Tras git pull: instala deps, Prisma, build y reinicio PM2 seguro (scripts/pm2-fix.sh).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT"

echo "==> Directorio del proyecto: $ROOT"
if [ -d .git ]; then
  echo "==> Rama y último commit:"
  git rev-parse --abbrev-ref HEAD 2>/dev/null || true
  git log -1 --oneline 2>/dev/null || true
else
  echo "!! No hay carpeta .git: no puedes actualizar código con git pull en esta ruta."
fi

echo "==> Instalación de dependencias de producción"
npm ci

echo "==> Prisma: generar cliente y sincronizar tablas (db push)"
npx prisma generate
npx prisma db push

echo "==> Build Next.js"
npm run build

# Si el build se ejecuta como root dentro de /home/ubuntu/..., los ficheros nuevos
# quedan de root y PM2 (usuario ubuntu) no puede leer .next → HTML sin CSS (403 en /_next/static).
if [ "$(id -u)" -eq 0 ]; then
  owner=$(stat -c "%U" . 2>/dev/null || true)
  if [ -n "${owner:-}" ] && [ "$owner" != "root" ]; then
    echo "==> Permisos: dejando el proyecto en manos de $owner (evita CSS roto si PM2 no es root)"
    chown -R "$owner:$owner" .
  fi
fi

echo "==> Reinicio seguro PM2 (puerto libre + delete + start + health)"
bash "$SCRIPT_DIR/pm2-fix.sh"

echo "Listo. Si la web no cambia: git pull, Ctrl+F5, y revisa que Nginx apunte al puerto PORT de .env"
