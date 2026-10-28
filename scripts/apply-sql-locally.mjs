// Применяет SQL-файл к prod-snapshot.db локально для тестов.
// Использует Prisma $executeRawUnsafe.
//
// Запуск: node scripts/apply-sql-locally.mjs data/audit/migrate-slugs.sql

import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const sqlFile = process.argv[2];
if (!sqlFile) {
  console.error("Usage: node scripts/apply-sql-locally.mjs <sql-file>");
  process.exit(1);
}

const prisma = new PrismaClient({
  datasources: { db: { url: `file:${path.resolve("prisma/prod-snapshot.db")}` } },
});

const sql = fs.readFileSync(sqlFile, "utf8");
// Разбиваем по ';' игнорируя пустые строки и комментарии
const statements = sql
  .split("\n")
  .filter((line) => !line.trim().startsWith("--"))
  .join("\n")
  .split(";")
  .map((s) => s.trim())
  .filter(Boolean);

console.log(`Применяю ${statements.length} statement'ов из ${sqlFile}...`);

let ok = 0;
let fail = 0;
for (const stmt of statements) {
  try {
    await prisma.$executeRawUnsafe(stmt);
    ok++;
  } catch (e) {
    fail++;
    if (fail <= 5) console.error(`FAIL: ${stmt.slice(0, 80)}... → ${e.message}`);
  }
}

console.log(`Done: ${ok} OK, ${fail} FAIL`);
await prisma.$disconnect();
