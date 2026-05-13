import { PrismaClient, Rol, EstadoComanda, EstadoPieza } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordAdmin = await bcrypt.hash("Admin123!", 10);
  const passwordProv = await bcrypt.hash("Proveedor123!", 10);

  await prisma.usuario.upsert({
    where: { email: "admin@empresa.local" },
    update: {},
    create: {
      nombre: "Administrador",
      email: "admin@empresa.local",
      password: passwordAdmin,
      rol: Rol.ADMIN,
      proveedor: null,
    },
  });

  const proveedor = await prisma.usuario.upsert({
    where: { email: "proveedor@ejemplo.local" },
    update: {},
    create: {
      nombre: "Proveedor demo",
      email: "proveedor@ejemplo.local",
      password: passwordProv,
      rol: Rol.PROVEEDOR,
      proveedor: "Proveedor ACME",
    },
  });

  await prisma.comanda.upsert({
    where: { numComanda: "CMD-2026-001" },
    update: {},
    create: {
      numComanda: "CMD-2026-001",
      reparacion: "Soldadura conjunto A",
      nomProveedor: "Proveedor ACME",
      estado: EstadoComanda.EN_PROCESO,
      fechaInsercion: new Date(),
      cerrada: false,
      piezas: {
        create: [
          {
            codiPieza: "PZ-1001",
            codigoFab: "FAB-01",
            cantidad: 2,
            codigoConjunto: "CJ-10",
            op: "OP-1",
            tipus: "T1",
            estado: EstadoPieza.HECHA,
            fechaEstado: new Date(),
          },
          {
            codiPieza: "PZ-1002",
            codigoFab: "FAB-02",
            cantidad: 1,
            estado: EstadoPieza.PENDIENTE,
          },
        ],
      },
    },
  });

  const piezaDemo = await prisma.piezaComanda.findFirst({
    where: { comanda: { numComanda: "CMD-2026-001" }, codiPieza: "PZ-1001" },
  });
  if (piezaDemo) {
    const ya = await prisma.historialEstado.count({ where: { piezaId: piezaDemo.id } });
    if (ya === 0) {
      await prisma.historialEstado.create({
        data: {
          piezaId: piezaDemo.id,
          usuarioId: proveedor.id,
          estadoAnterior: EstadoPieza.PENDIENTE,
          estadoNuevo: EstadoPieza.HECHA,
          comentario: "Seed inicial",
        },
      });
    }
  }

  await prisma.comanda.upsert({
    where: { numComanda: "CMD-2026-002" },
    update: {},
    create: {
      numComanda: "CMD-2026-002",
      nomProveedor: "Proveedor ACME",
      estado: EstadoComanda.ABIERTA,
      fechaInsercion: new Date(),
      piezas: {
        create: {
          codiPieza: "PZ-2001",
          cantidad: 5,
          estado: EstadoPieza.PENDIENTE,
        },
      },
    },
  });

  console.log("Seed OK.");
  console.log("  Admin:     admin@empresa.local / Admin123!");
  console.log("  Proveedor: proveedor@ejemplo.local / Proveedor123!");
  console.log("  Comandas:  CMD-2026-001, CMD-2026-002 (proveedor: Proveedor ACME)");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
