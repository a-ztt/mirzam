// Генерирует:
//   1. data/audit/migrate-slugs.sql           — UPDATE slug для прода
//   2. data/audit/migrate-slugs-rollback.sql  — откат
//   3. data/audit/migrate-title-dedup.sql     — добавить SKU в title-дубликаты
//   4. data/audit/migrate-title-dedup-rollback.sql
//   5. src/lib/slug-redirects.json            — для middleware
//
// Запуск: node scripts/generate-migration-artifacts.mjs

import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: {
    db: { url: `file:${path.resolve("prisma/prod-snapshot.db")}` },
  },
});

const OUT_DIR = "data/audit";
fs.mkdirSync(OUT_DIR, { recursive: true });

const TRANSLIT = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh",
  з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o",
  п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts",
  ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

const slugify = (s) =>
  String(s ?? "")
    .toLowerCase()
    .split("")
    .map((ch) => (TRANSLIT[ch] !== undefined ? TRANSLIT[ch] : ch))
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");

const isBadSlug = (slug) =>
  /^new-[a-f0-9]+$/.test(slug) ||
  /^p-\d+$/.test(slug) ||
  /^import-.+-p-\d+$/.test(slug) ||
  /^\d+-.+-p-\d+$/.test(slug);

const sqlEscape = (s) => String(s).replace(/'/g, "''");

// ─────────────────────────────────────────────────────────────────────────────

const all = await prisma.product.findMany({
  where: { isActive: true },
  select: { id: true, slug: true, title: true, sku: true },
  orderBy: { id: "asc" },
});

// ── 1. План slug-миграции ───────────────────────────────────────────────────
const claimed = new Set(all.filter((p) => !isBadSlug(p.slug)).map((p) => p.slug));
const slugMigration = []; // {id, oldSlug, newSlug}

for (const p of all) {
  if (!isBadSlug(p.slug)) continue;

  const titlePart = slugify(p.title);
  if (!titlePart) continue;

  let candidate = titlePart;
  if (p.sku) {
    const skuPart = slugify(p.sku);
    if (skuPart && titlePart.length + skuPart.length + 1 <= 80) {
      candidate = `${titlePart}-${skuPart}`;
    }
  }

  let finalSlug = candidate;
  let n = 2;
  while (claimed.has(finalSlug)) {
    const suffix = `-${n}`;
    finalSlug = candidate.slice(0, 80 - suffix.length) + suffix;
    n++;
    if (n > 1000) throw new Error(`Не смог разрулить коллизию для ${p.id}`);
  }
  claimed.add(finalSlug);

  slugMigration.push({ id: p.id, oldSlug: p.slug, newSlug: finalSlug });
}

// Safety: проверяем что новые slug'и НЕ пересекаются со старыми (иначе UPDATE
// упадёт из-за UNIQUE constraint посреди транзакции).
const oldSet = new Set(all.map((p) => p.slug));
const conflicts = slugMigration.filter((m) => oldSet.has(m.newSlug) && m.newSlug !== m.oldSlug);
if (conflicts.length) {
  console.error(`КОНФЛИКТ: ${conflicts.length} новых slug'ов совпадают со старыми:`);
  for (const c of conflicts.slice(0, 5)) console.error(`  ${c.oldSlug} → ${c.newSlug}`);
  process.exit(1);
}

// ── 2. SQL для slug-миграции ────────────────────────────────────────────────
const slugSql = [
  "-- Slug migration для прод-БД",
  "-- Генерируется автоматически. Применяй внутри транзакции.",
  `-- Дата: ${new Date().toISOString()}`,
  `-- Товаров к миграции: ${slugMigration.length}`,
  "",
  "BEGIN TRANSACTION;",
  "",
];
for (const m of slugMigration) {
  slugSql.push(
    `UPDATE "Product" SET "slug" = '${sqlEscape(m.newSlug)}', "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = '${sqlEscape(m.id)}';`,
  );
}
slugSql.push("", "COMMIT;");
fs.writeFileSync(path.join(OUT_DIR, "migrate-slugs.sql"), slugSql.join("\n"));

// ── 3. Rollback ──────────────────────────────────────────────────────────────
const slugRollback = [
  "-- Rollback slug-migration",
  `-- Дата генерации: ${new Date().toISOString()}`,
  "",
  "BEGIN TRANSACTION;",
  "",
];
for (const m of slugMigration) {
  slugRollback.push(
    `UPDATE "Product" SET "slug" = '${sqlEscape(m.oldSlug)}' WHERE "id" = '${sqlEscape(m.id)}';`,
  );
}
slugRollback.push("", "COMMIT;");
fs.writeFileSync(path.join(OUT_DIR, "migrate-slugs-rollback.sql"), slugRollback.join("\n"));

// ── 4. JSON для middleware ──────────────────────────────────────────────────
const redirectMap = Object.fromEntries(slugMigration.map((m) => [m.oldSlug, m.newSlug]));
fs.mkdirSync("src/lib", { recursive: true });
fs.writeFileSync(
  "src/lib/slug-redirects.json",
  JSON.stringify(redirectMap, null, 0), // компактно — это runtime artifact
);

// ── 5. Title de-duplication ─────────────────────────────────────────────────
const titleMap = new Map();
for (const p of all) {
  const k = p.title.trim().toLowerCase();
  if (!titleMap.has(k)) titleMap.set(k, []);
  titleMap.get(k).push(p);
}
const titleUpdates = [];
for (const [, ps] of titleMap) {
  if (ps.length < 2) continue;
  for (const p of ps) {
    const sku = (p.sku ?? "").trim();
    if (!sku) continue; // без SKU не можем уникализировать
    const newTitle = `${p.title.trim()} · Арт. ${sku}`;
    if (newTitle === p.title) continue;
    titleUpdates.push({ id: p.id, oldTitle: p.title, newTitle });
  }
}

const titleSql = [
  "-- Title de-duplication: добавляем '· Арт. <SKU>' к дубликатам",
  `-- Товаров: ${titleUpdates.length}`,
  "",
  "BEGIN TRANSACTION;",
  "",
];
for (const u of titleUpdates) {
  titleSql.push(
    `UPDATE "Product" SET "title" = '${sqlEscape(u.newTitle)}', "updatedAt" = CURRENT_TIMESTAMP WHERE "id" = '${sqlEscape(u.id)}';`,
  );
}
titleSql.push("", "COMMIT;");
fs.writeFileSync(path.join(OUT_DIR, "migrate-title-dedup.sql"), titleSql.join("\n"));

const titleRollback = [
  "-- Rollback title de-duplication",
  "",
  "BEGIN TRANSACTION;",
  "",
];
for (const u of titleUpdates) {
  titleRollback.push(
    `UPDATE "Product" SET "title" = '${sqlEscape(u.oldTitle)}' WHERE "id" = '${sqlEscape(u.id)}';`,
  );
}
titleRollback.push("", "COMMIT;");
fs.writeFileSync(
  path.join(OUT_DIR, "migrate-title-dedup-rollback.sql"),
  titleRollback.join("\n"),
);

// ── Summary ─────────────────────────────────────────────────────────────────
console.log("Артефакты сгенерированы:\n");
console.log(`  ${OUT_DIR}/migrate-slugs.sql                  (${slugMigration.length} UPDATE'ов)`);
console.log(`  ${OUT_DIR}/migrate-slugs-rollback.sql`);
console.log(`  ${OUT_DIR}/migrate-title-dedup.sql            (${titleUpdates.length} UPDATE'ов)`);
console.log(`  ${OUT_DIR}/migrate-title-dedup-rollback.sql`);
console.log(`  src/lib/slug-redirects.json                   (${Object.keys(redirectMap).length} редиректов)`);

await prisma.$disconnect();
