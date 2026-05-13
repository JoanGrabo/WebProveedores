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

echo "==> Reiniciar aplicación PM2 (ajusta el nombre si lo cambiaste)"
pm2 restart web-proveedores || pm2 start ecosystem.config.cjs

echo "Listo. Comprueba: pm2 status y curl -I http://127.0.0.1:3000"
