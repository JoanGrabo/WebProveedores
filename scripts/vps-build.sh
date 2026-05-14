#!/usr/bin/env bash
# Ejecutar en el VPS Ubuntu dentro del directorio del proyecto (después de git pull).
set -euo pipefail

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

echo "==> Reiniciar aplicación PM2 (ajusta el nombre si lo cambiaste)"
pm2 restart web-proveedores || pm2 start ecosystem.config.cjs

echo "Listo. Comprueba: pm2 status y curl -I http://127.0.0.1:3000"
echo "Si la web se ve sin estilos: recarga forzada (Ctrl+F5). Si el build fue como root y PM2 es otro usuario:"
echo "  chown -R USUARIO:USUARIO \"$(pwd)\""
