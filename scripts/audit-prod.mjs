// Одноразовый скрипт для аудита prod-snapshot.db.
// Запуск: node scripts/audit-prod.mjs
// Использует уже установленный @prisma/client с DATABASE_URL на снапшот.

import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: {
    db: { url: `file:${path.resolve("prisma/prod-snapshot.db")}` },
  },
});

function box(title) {
  const line = "─".repeat(Math.max(20, title.length + 4));
  console.log(`\n┌${line}┐`);
  console.log(`│  ${title}${" ".repeat(line.length - title.length - 2)}│`);
  console.log(`└${line}┘`);
}

async function main() {
  // 1. Общая сводка
  box("1. ОБЩАЯ СВОДКА");
  const total = await prisma.product.count();
  const active = await prisma.product.count({ where: { isActive: true } });
  const inactive = total - active;
  console.log(`Всего товаров:        ${total}`);
  console.log(`  активных:           ${active}`);
  console.log(`  неактивных:         ${inactive}`);

  // 2. Слаги по паттернам
  box("2. ТИПЫ СЛАГОВ (только активные)");
  const all = await prisma.product.findMany({
    where: { isActive: true },
    select: {
      slug: true,
      title: true,
      sku: true,
      description: true,
      category: true,
      brand: true,
      priceKzt: true,
      qty: true,
      images: { select: { id: true } },
    },
  });

  const patterns = {
    "new-XXX (placeholder из админки)": /^new-[a-f0-9]+$/,
    "p-N (legacy)": /^p-\d+$/,
    "import-лист1-1-p-N": /^import-лист1-\d+-p-\d+$/,
    "import-запчасти-ваз-1-p-N": /^import-запчасти-ваз-\d+-p-\d+$/,
    "import-запчасти-раз-газ-1-p-N": /^import-запчасти-раз-газ-\d+-p-\d+$/,
    "2-лист1-1-p-N": /^2-лист1-\d+-p-\d+$/,
    "3-лист1-1-p-N": /^3-лист1-\d+-p-\d+$/,
  };

  const buckets = Object.fromEntries(Object.keys(patterns).map((k) => [k, 0]));
  let other = 0;
  for (const p of all) {
    let matched = false;
    for (const [name, re] of Object.entries(patterns)) {
      if (re.test(p.slug)) {
        buckets[name]++;
        matched = true;
        break;
      }
    }
    if (!matched) other++;
  }
  for (const [name, count] of Object.entries(buckets)) {
    console.log(`  ${count.toString().padStart(4)}  ${name}`);
  }
  console.log(`  ${other.toString().padStart(4)}  ОСТАЛЬНЫЕ (нормальные/читаемые слаги)`);

  // 3. Тонкий контент
  box("3. ТОНКИЙ КОНТЕНТ (активные товары)");
  const defaultTitle = all.filter((p) => p.title === "Новый товар").length;
  const noDescription = all.filter(
    (p) => !p.description || p.description.trim().length < 10,
  ).length;
  const noPrice = all.filter((p) => !p.priceKzt || p.priceKzt === 0).length;
  const noSku = all.filter((p) => !p.sku || p.sku.trim().length < 2).length;
  const noBrand = all.filter((p) => !p.brand || p.brand.trim().length < 1).length;
  const noCategory = all.filter(
    (p) => !p.category || p.category.trim().length < 1,
  ).length;
  const noImages = all.filter((p) => p.images.length === 0).length;
  console.log(`  title = "Новый товар":      ${defaultTitle}`);
  console.log(`  без описания / < 10 симв.:  ${noDescription}`);
  console.log(`  без цены (0 или null):      ${noPrice}`);
  console.log(`  без SKU:                    ${noSku}`);
  console.log(`  без бренда:                 ${noBrand}`);
  console.log(`  без категории:              ${noCategory}`);
  console.log(`  без фото:                   ${noImages}`);

  // 4. Категории — раскладка
  box("4. КАТЕГОРИИ (активные товары)");
  const catMap = new Map();
  for (const p of all) {
    const k = p.category ?? "(пусто)";
    catMap.set(k, (catMap.get(k) ?? 0) + 1);
  }
  const sortedCats = Array.from(catMap.entries()).sort((a, b) => b[1] - a[1]);
  for (const [name, count] of sortedCats) {
    console.log(`  ${count.toString().padStart(4)}  ${name}`);
  }

  // 5. Брошенные new-XXX (полу-пустые)
  box("5. БРОШЕННЫЕ new-XXX (active, но почти пустые)");
  const abandoned = all.filter(
    (p) =>
      /^new-[a-f0-9]+$/.test(p.slug) &&
      (p.title === "Новый товар" ||
        !p.description ||
        !p.priceKzt ||
        p.images.length === 0),
  );
  console.log(`Найдено: ${abandoned.length}`);
  if (abandoned.length > 0 && abandoned.length <= 20) {
    for (const p of abandoned) {
      console.log(
        `  /products/${p.slug}  · title="${p.title}"  · price=${p.priceKzt ?? 0}  · imgs=${p.images.length}`,
      );
    }
  } else if (abandoned.length > 20) {
    console.log("  (первые 10)");
    for (const p of abandoned.slice(0, 10)) {
      console.log(
        `  /products/${p.slug}  · title="${p.title}"  · price=${p.priceKzt ?? 0}  · imgs=${p.images.length}`,
      );
    }
  }

  // 6. Дубликаты по title (могут быть причиной "duplicate, canonical not selected")
  box("6. ДУБЛИКАТЫ ПО НАЗВАНИЮ (active)");
  const titleMap = new Map();
  for (const p of all) {
    const k = p.title.trim().toLowerCase();
    if (!titleMap.has(k)) titleMap.set(k, []);
    titleMap.get(k).push(p.slug);
  }
  const dups = Array.from(titleMap.entries()).filter(([, slugs]) => slugs.length > 1);
  console.log(`Группы одинаковых названий: ${dups.length}`);
  console.log(`Всего товаров в дубликатах: ${dups.reduce((s, [, slugs]) => s + slugs.length, 0)}`);
  if (dups.length > 0) {
    console.log("\nТоп-10 групп (по количеству копий):");
    const top = dups.sort((a, b) => b[1].length - a[1].length).slice(0, 10);
    for (const [title, slugs] of top) {
      console.log(`  ${slugs.length}× "${title}"`);
    }
  }

  // 7. Отзывы
  box("7. ОТЗЫВЫ");
  const reviews = await prisma.review.count();
  const approved = await prisma.review.count({ where: { isApproved: true } });
  console.log(`Всего отзывов:    ${reviews}`);
  console.log(`  одобрено:       ${approved}`);
  console.log(`  на модерации:   ${reviews - approved}`);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
