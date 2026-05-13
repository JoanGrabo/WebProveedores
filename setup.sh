#!/usr/bin/env bash
# Instalación rápida en Ubuntu/Linux: copia la carpeta, edita .env y ejecuta:
#   chmod +x setup.sh && ./setup.sh
set -euo pipefail

cd "$(dirname "$0")"

if ! command -v node &>/dev/null; then
  echo "Instala Node.js 20+ primero, por ejemplo:"
  echo "  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
  echo "  sudo apt install -y nodejs"
  exit 1
fi

if [ ! -f .env ]; then
  cp .env.example .env
  echo ""
  echo ">>> Se creó .env desde .env.example"
  echo ">>> Edítalo y pon DATABASE_URL y JWT_SECRET antes de volver a ejecutar este script."
  echo "    nano .env"
  exit 0
fi

echo "==> npm install"
npm install

echo "==> Prisma: generar cliente y crear tablas (db push)"
npx prisma generate
npx prisma db push --accept-data-loss

echo "==> Datos de ejemplo (seed)"
npx prisma db seed

echo ""
echo "Listo."
echo "  Desarrollo:  npm run dev"
echo "  Producción:  npm run build && npx pm2 start ecosystem.config.cjs"
echo ""
