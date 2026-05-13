/**
 * Configuración PM2 para Ubuntu VPS.
 *
 * Uso típico en el servidor:
 *   cd /var/www/web-proveedores   # o la ruta donde clones el proyecto
 *   npm ci && npx prisma generate && npm run build
 *   pm2 start ecosystem.config.cjs
 *   pm2 save && pm2 startup
 *
 * Las variables sensibles deben estar en .env (PM2 las carga si usas dotenv
 * o puedes definirlas en `env`/`env_production` aquí; recomendado: solo .env en disco).
 */
module.exports = {
  apps: [
    {
      name: "web-proveedores",
      cwd: __dirname,
      script: "node_modules/next/dist/bin/next",
      args: "start",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
  ],
};
