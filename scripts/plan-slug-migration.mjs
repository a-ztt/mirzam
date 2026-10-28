// Dry-run: генерирует план миграции slug'ов, список дубликатов и
// список товаров в фейковой категории "Каталог". Ничего не меняет в БД.
//
// Запуск: node scripts/plan-slug-migration.mjs

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

// ─────────────────────────────────────────────────────────────────────────────
// Транслитерация ru → en
// ─────────────────────────────────────────────────────────────────────────────
const TRANSLIT = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh",
  з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o",
  п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts",
  ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu",
  я: "ya",
};

function transliterate(s) {
  return s
    .toLowerCase()
    .split("")
    .map((ch) => (TRANSLIT[ch] !== undefined ? TRANSLIT[ch] : ch))
    .join("");
}

function slugify(input) {
  if (!input) return "";
  return transliterate(String(input))
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

function isBadSlug(slug) {
  return (
    /^new-[a-f0-9]+$/.test(slug) ||
    /^p-\d+$/.test(slug) ||
    /^import-.+-p-\d+$/.test(slug) ||
    /^\d+-.+-p-\d+$/.test(slug)
  );
}

function buildCandidate(product) {
  // Используем title + (опционально) sku для уникальности
  const titlePart = slugify(product.title);
  if (!titlePart) return null;

  const skuPart = product.sku ? slugify(product.sku) : "";
  if (skuPart && titlePart.length + skuPart.length + 1 <= 80) {
    return `${titlePart}-${skuPart}`;
  }
  return titlePart;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

const all = await prisma.product.findMany({
  where: { isActive: true },
  select: {
    id: true,
    slug: true,
    title: true,
    sku: true,
    category: true,
    brand: true,
    priceKzt: true,
    qty: true,
    description: true,
    images: { select: { id: true } },
  },
  orderBy: { id: "asc" },
});

// ─── 1. План миграции слагов ────────────────────────────────────────────────
const goodSlugs = new Set(
  all.filter((p) => !isBadSlug(p.slug)).map((p) => p.slug),
);
const toMigrate = all.filter((p) => isBadSlug(p.slug));

const claimed = new Set(goodSlugs); // зарезервированы хорошие слаги
const mapping = []; // [{oldSlug, newSlug, id, title, sku, why}]
const failed = []; // [{id, slug, title, reason}]

for (const p of toMigrate) {
  let cand = buildCandidate(p);
  if (!cand) {
    failed.push({
      id: p.id,
      slug: p.slug,
      title: p.title,
      reason: "title не транслитерируется в slug",
    });
    continue;
  }

  // Уникализация
  let finalSlug = cand;
  let n = 2;
  while (claimed.has(finalSlug)) {
    const suffix = `-${n}`;
    finalSlug = cand.slice(0, 80 - suffix.length) + suffix;
    n++;
    if (n > 100) break;
  }
  claimed.add(finalSlug);

  mapping.push({
    id: p.id,
    oldSlug: p.slug,
    newSlug: finalSlug,
    title: p.title,
    sku: p.sku ?? "",
  });
}

console.log(`\n=== ПЛАН МИГРАЦИИ SLUG'ОВ ===`);
console.log(`Активных товаров:              ${all.length}`);
console.log(`Уже с хорошим slug'ом:         ${goodSlugs.size}`);
console.log(`Подлежит миграции:             ${toMigrate.length}`);
console.log(`План сгенерирован:             ${mapping.length}`);
console.log(`Не удалось сгенерировать:      ${failed.length}`);
console.log(`Конфликты решены суффиксом:    ${mapping.filter((m) => /-\d+$/.test(m.newSlug)).length}`);

// Записываем CSV для просмотра
const csvLines = ["old_slug,new_slug,title,sku,id"];
for (const m of mapping) {
  const safe = (s) => `"${String(s ?? "").replace(/"/g, '""')}"`;
  csvLines.push(
    `${safe(m.oldSlug)},${safe(m.newSlug)},${safe(m.title)},${safe(m.sku)},${safe(m.id)}`,
  );
}
fs.writeFileSync(path.join(OUT_DIR, "slug-migration-plan.csv"), csvLines.join("\n"));
console.log(`→ ${OUT_DIR}/slug-migration-plan.csv (${mapping.length} строк)`);

// JSON для middleware (oldSlug → newSlug)
const redirectMap = Object.fromEntries(mapping.map((m) => [m.oldSlug, m.newSlug]));
fs.writeFileSync(
  path.join(OUT_DIR, "slug-redirects.json"),
  JSON.stringify(redirectMap, null, 2),
);
console.log(`→ ${OUT_DIR}/slug-redirects.json (для middleware)`);

if (failed.length) {
  console.log(`\nНе удалось мигрировать ${failed.length} товаров:`);
  for (const f of failed.slice(0, 10)) {
    console.log(`  [${f.id}] slug="${f.slug}" title="${f.title}" → ${f.reason}`);
  }
}

// Примеры миграции
console.log(`\nПервые 15 примеров миграции:`);
for (const m of mapping.slice(0, 15)) {
  console.log(`  /products/${m.oldSlug}`);
  console.log(`    → /products/${m.newSlug}`);
  console.log(`    title: "${m.title}"`);
}

// ─── 2. Дубликаты ────────────────────────────────────────────────────────────
const titleMap = new Map();
for (const p of all) {
  const k = p.title.trim().toLowerCase();
  if (!titleMap.has(k)) titleMap.set(k, []);
  titleMap.get(k).push(p);
}
const dups = Array.from(titleMap.entries())
  .filter(([, ps]) => ps.length > 1)
  .sort((a, b) => b[1].length - a[1].length);

console.log(`\n=== ДУБЛИКАТЫ ПО НАЗВАНИЮ ===`);
console.log(`Групп: ${dups.length}, всего товаров в дубликатах: ${dups.reduce((s, [, ps]) => s + ps.length, 0)}`);

const dupLines = ["group_title,count,id,slug,sku,brand,price,qty,has_description,images"];
for (const [title, ps] of dups) {
  for (const p of ps) {
    const safe = (s) => `"${String(s ?? "").replace(/"/g, '""')}"`;
    dupLines.push(
      [
        safe(title),
        ps.length,
        safe(p.id),
        safe(p.slug),
        safe(p.sku),
        safe(p.brand),
        p.priceKzt ?? 0,
        p.qty ?? 0,
        p.description ? 1 : 0,
        p.images.length,
      ].join(","),
    );
  }
}
fs.writeFileSync(path.join(OUT_DIR, "duplicates.csv"), dupLines.join("\n"));
console.log(`→ ${OUT_DIR}/duplicates.csv`);

// ─── 3. Категория "Каталог" ──────────────────────────────────────────────────
const catalogProducts = all.filter((p) => p.category === "Каталог");
console.log(`\n=== КАТЕГОРИЯ "Каталог" (фейковая) ===`);
console.log(`Товаров: ${catalogProducts.length}`);

const catLines = ["id,slug,title,sku,brand,price,qty,images,has_description"];
for (const p of catalogProducts) {
  const safe = (s) => `"${String(s ?? "").replace(/"/g, '""')}"`;
  catLines.push(
    [
      safe(p.id),
      safe(p.slug),
      safe(p.title),
      safe(p.sku),
      safe(p.brand),
      p.priceKzt ?? 0,
      p.qty ?? 0,
      p.images.length,
      p.description ? 1 : 0,
    ].join(","),
  );
}
fs.writeFileSync(path.join(OUT_DIR, "category-catalog.csv"), catLines.join("\n"));
console.log(`→ ${OUT_DIR}/category-catalog.csv`);

await prisma.$disconnect();
console.log(`\nВсе файлы в ${OUT_DIR}/. Просмотри их в Excel или открой в редакторе.`);
