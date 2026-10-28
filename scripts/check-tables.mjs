import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: {
    db: { url: `file:${path.resolve("prisma/prod-snapshot.db")}` },
  },
});

const tables = await prisma.$queryRawUnsafe(
  "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
);
console.log("Tables:", tables);

await prisma.$disconnect();
