/**
 * Mismo flujo que setup.sh pero en Node (Windows o Linux).
 * Uso: npm run instalar
 */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
process.chdir(root);

const envPath = path.join(root, ".env");
const examplePath = path.join(root, ".env.example");

if (!fs.existsSync(envPath)) {
  if (!fs.existsSync(examplePath)) {
    console.error("Falta .env.example");
    process.exit(1);
  }
  fs.copyFileSync(examplePath, envPath);
  console.log("\n>>> Se creó .env — edita DATABASE_URL y JWT_SECRET y vuelve a ejecutar: npm run instalar\n");
  process.exit(0);
}

function run(cmd) {
  console.log("\n==>", cmd);
  execSync(cmd, { stdio: "inherit", env: process.env });
}

run("npm install");
run("npx prisma generate");
run("npx prisma db push");
run("npx prisma db seed");

console.log("\nListo. npm run dev  |  Producción: npm run build\n");
