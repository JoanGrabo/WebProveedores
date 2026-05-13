# Portal comandas — Web Proveedores

Aplicación Next.js para gestionar comandas entre la empresa y los proveedores. Este repositorio está pensado para **desplegarse en un VPS con Ubuntu** (Node.js, PM2, Nginx, MySQL/MariaDB).

### Modo más fácil (copiar carpeta y ejecutar)

1. Lee **`PASOS.txt`** en la raíz del proyecto.
2. **Ubuntu:** `chmod +x setup.sh && ./setup.sh` (dos veces si la primera solo crea `.env`).
3. **Windows:** `npm run instalar` (igual: si crea `.env`, edítalo y repite).

Eso instala dependencias, crea las tablas en MySQL (`prisma db push`) y carga datos de ejemplo (`seed`).

## Requisitos en el VPS (Ubuntu 22.04 LTS o superior)

- **Node.js 20 LTS** (recomendado; también 18 LTS suele valer)
- **MySQL 8** o **MariaDB 10.6+** (accesible desde el mismo servidor o red privada)
- **Nginx** como proxy inverso hacia la app
- **PM2** para mantener el proceso Node en producción

### Instalar Node.js (ejemplo con NodeSource)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs build-essential
node -v && npm -v
```

### Instalar PM2 globalmente

```bash
sudo npm install -g pm2
```

### Instalar Nginx

```bash
sudo apt update && sudo apt install -y nginx
```

---

## Pasar el proyecto del PC Windows al VPS

Elige una opción:

1. **Git (recomendado):** sube el código a un repositorio privado y en el VPS:
   ```bash
   sudo mkdir -p /var/www && sudo chown $USER:$USER /var/www
   cd /var/www
   git clone <URL_DE_TU_REPO> web-proveedores
   cd web-proveedores
   ```
2. **SCP / SFTP / carpeta completa:** puedes copiar **toda** la carpeta; en el servidor ejecuta `./setup.sh` (o `npm install` si ya trajiste `node_modules` desde Windows, aunque en Linux suele ser mejor reinstalar con el script).

En Windows desarrollas con `npm run dev`; en Ubuntu el flujo de producción es **build + PM2 + Nginx**.

---

## Configuración en el servidor

### 1. Variables de entorno

```bash
cd /var/www/web-proveedores   # ajusta la ruta
cp .env.example .env
nano .env
```

Completa al menos `DATABASE_URL`, `JWT_SECRET` y `NEXT_PUBLIC_APP_URL` (tu dominio o IP pública con `https` si usas TLS).

Generar un secreto JWT:

```bash
openssl rand -base64 48
```

### 2. Base de datos y Prisma

Cuando el `schema.prisma` y las migraciones estén listos:

```bash
npm ci
npx prisma migrate deploy
npm run build
```

*(Si aún no hay migraciones, el equipo de desarrollo las generará con `prisma migrate dev` contra una base de pruebas.)*

### 3. Arranque con PM2

Desde la raíz del proyecto:

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

El último comando muestra una línea `sudo env ...` que debes ejecutar una vez para que PM2 se levante al reiniciar el VPS.

Comandos útiles:

```bash
pm2 status
pm2 logs web-proveedores
pm2 restart web-proveedores
```

La app escucha por defecto en el **puerto 3000** en localhost (ver `PORT` en `.env` y `ecosystem.config.cjs`).

### 4. Nginx

Copia el ejemplo y ajusta `server_name` y rutas SSL si usas Certbot:

```bash
sudo cp deploy/nginx-web-proveedores.conf /etc/nginx/sites-available/web-proveedores
sudo nano /etc/nginx/sites-available/web-proveedores
sudo ln -sf /etc/nginx/sites-available/web-proveedores /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

Certificado gratuito (Let's Encrypt):

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d tu-dominio.com
```

### 5. Firewall (UFW)

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

---

## Actualizar la aplicación tras cambios en el código

En el VPS, dentro del proyecto:

```bash
git pull
chmod +x scripts/vps-build.sh   # solo la primera vez
./scripts/vps-build.sh
```

O manualmente: `npm ci`, `npx prisma migrate deploy`, `npm run build`, `pm2 restart web-proveedores`.

---

## Desarrollo local (cualquier OS)

```bash
npm install
cp .env.example .env
# Configura DATABASE_URL apuntando a tu MySQL local o remoto
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

---

## Archivos relevantes para el despliegue

| Archivo | Uso |
|--------|-----|
| `.env.example` | Plantilla de variables para copiar a `.env` en el VPS |
| `ecosystem.config.cjs` | Proceso PM2 (`next start`) |
| `deploy/nginx-web-proveedores.conf` | Ejemplo de proxy a `127.0.0.1:3000` |
| `scripts/vps-build.sh` | Build + migraciones + reinicio PM2 |

---

## Notas

- **No subas `.env`** al repositorio; en el servidor sí debe existir con valores reales.
- MySQL en el mismo VPS: usa `127.0.0.1` en `DATABASE_URL` y usuario con permisos solo sobre la base necesaria.
- Si cambias el puerto interno, actualiza **Nginx** (`upstream`) y **PM2** / `.env` de forma coherente.
