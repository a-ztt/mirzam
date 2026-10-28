// Generate migration artifacts for deactivating products without photos.
// Reads prod-snapshot.db (pre-migration), outputs:
//   - data/audit/migrate-deactivate-no-photo.sql       (forward)
//   - data/audit/migrate-deactivate-no-photo-rollback.sql (rollback)
//   - src/lib/gone-slugs.json                          (for middleware)
//
// Approach: temp table strategy. Migration captures IDs into
// _migration_deactivate_no_photo_ids first, then UPDATEs. Rollback reads
// from same temp table. Works even if prod state drifts slightly from snapshot.
import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient({
  datasources: { db: { url: `file:${path.resolve("prisma/prod-snapshot.db")}` } },
});

const slugRedirects = JSON.parse(
  fs.readFileSync("src/lib/slug-redirects.json", "utf8")
);

// Existing GONE_SLUGS from middleware.ts — 14 hardcoded truly-missing slugs
// from the original audit. We merge them into the new gone-slugs.json.
const ORIGINAL_GONE = [
  "p-247",
  "2-лист1-1-p-597",
  "2-лист1-1-p-711",
  "3-лист1-1-p-15",
  "3-лист1-1-p-161",
  "import-лист1-1-p-64",
  "import-лист1-1-p-160",
  "import-лист1-1-p-399",
  "import-лист1-1-p-597",
  "import-лист1-1-p-643",
  "import-лист1-1-p-717",
  "import-запчасти-раз-газ-1-p-75",
  "import-запчасти-раз-газ-1-p-123",
  "import-запчасти-раз-газ-1-p-248",
];

const productsWithoutPhotos = await prisma.product.findMany({
  where: {
    isActive: true,
    images: { none: {} },
  },
  select: { id: true, slug: true, title: true },
  orderBy: { id: "asc" },
});

console.log(`В снапшоте: ${productsWithoutPhotos.length} активных товаров без фото`);

if (productsWithoutPhotos.length < 300 || productsWithoutPhotos.length > 400) {
  console.error(`⚠️  Ожидали ~332, получили ${productsWithoutPhotos.length}. Проверь снапшот.`);
  process.exit(1);
}

// Forward migration via temp table
const forwardSql = `-- Деактивация товаров без фото
-- Сгенерировано: ${new Date().toISOString()}
-- Источник: prod-snapshot.db
-- Затронет ${productsWithoutPhotos.length} товаров.
--
-- Стратегия: создаём временную таблицу с ID, делаем UPDATE.
-- Временная таблица остаётся в БД для возможного rollback.

BEGIN TRANSACTION;

DROP TABLE IF EXISTS _migration_deactivate_no_photo_ids;
CREATE TABLE _migration_deactivate_no_photo_ids (
  id TEXT PRIMARY KEY
);

-- Captured IDs (snapshot of 2026-05-22):
${productsWithoutPhotos.map((p) => `INSERT INTO _migration_deactivate_no_photo_ids VALUES ('${p.id}');`).join("\n")}

-- Deactivate (with safety check: still active AND still no photos)
UPDATE Product
SET isActive = 0, updatedAt = CURRENT_TIMESTAMP
WHERE id IN (SELECT id FROM _migration_deactivate_no_photo_ids)
  AND isActive = 1
  AND NOT EXISTS (SELECT 1 FROM ProductImage WHERE productId = Product.id);

COMMIT;

-- Verify
SELECT
  (SELECT COUNT(*) FROM Product WHERE isActive=1) AS still_active,
  (SELECT COUNT(*) FROM Product WHERE isActive=0) AS now_inactive,
  (SELECT COUNT(*) FROM _migration_deactivate_no_photo_ids) AS captured_ids;
`;

fs.writeFileSync("data/audit/migrate-deactivate-no-photo.sql", forwardSql);
console.log("✅ migrate-deactivate-no-photo.sql");

// Rollback
const rollbackSql = `-- ROLLBACK для migrate-deactivate-no-photo.sql
-- Восстанавливает isActive=1 для товаров, которые были деактивированы миграцией.
-- Использует таблицу _migration_deactivate_no_photo_ids, созданную при миграции.

BEGIN TRANSACTION;

UPDATE Product
SET isActive = 1, updatedAt = CURRENT_TIMESTAMP
WHERE id IN (SELECT id FROM _migration_deactivate_no_photo_ids)
  AND isActive = 0;

DROP TABLE IF EXISTS _migration_deactivate_no_photo_ids;

COMMIT;

-- Verify
SELECT
  (SELECT COUNT(*) FROM Product WHERE isActive=1) AS active_after_rollback,
  (SELECT COUNT(*) FROM Product WHERE isActive=0) AS inactive_after_rollback;
`;

fs.writeFileSync(
  "data/audit/migrate-deactivate-no-photo-rollback.sql",
  rollbackSql
);
console.log("✅ migrate-deactivate-no-photo-rollback.sql");

// Build gone-slugs.json: old slug (pre-migration) + new slug (post-migration)
// for each of the 332 products, plus the original 14.
const goneSet = new Set(ORIGINAL_GONE);
let missingNewSlug = 0;

for (const p of productsWithoutPhotos) {
  goneSet.add(p.slug); // pre-migration slug from snapshot
  const newSlug = slugRedirects[p.slug];
  if (newSlug) {
    goneSet.add(newSlug);
  } else {
    missingNewSlug++;
  }
}

const goneSlugs = [...goneSet].sort();
fs.writeFileSync(
  "src/lib/gone-slugs.json",
  JSON.stringify(goneSlugs, null, 2)
);
console.log(`✅ src/lib/gone-slugs.json (${goneSlugs.length} unique slugs)`);
if (missingNewSlug > 0) {
  console.log(`   ⚠️  ${missingNewSlug} товаров без записи в slug-redirects.json (старый формат уже корректный?)`);
}

await prisma.$disconnect();
