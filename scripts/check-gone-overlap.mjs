import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: { db: { url: `file:${path.resolve("prisma/prod-snapshot.db")}` } },
});

const GONE_SLUGS = [
  "p-111", "p-112", "p-247",
  "2-лист1-1-p-200", "2-лист1-1-p-597", "2-лист1-1-p-711",
  "3-лист1-1-p-15", "3-лист1-1-p-28", "3-лист1-1-p-161", "3-лист1-1-p-543",
  "import-лист1-1-p-64", "import-лист1-1-p-139", "import-лист1-1-p-154",
  "import-лист1-1-p-160", "import-лист1-1-p-187", "import-лист1-1-p-223",
  "import-лист1-1-p-226", "import-лист1-1-p-250", "import-лист1-1-p-320",
  "import-лист1-1-p-334", "import-лист1-1-p-399", "import-лист1-1-p-425",
  "import-лист1-1-p-447", "import-лист1-1-p-528", "import-лист1-1-p-597",
  "import-лист1-1-p-601", "import-лист1-1-p-603", "import-лист1-1-p-611",
  "import-лист1-1-p-631", "import-лист1-1-p-643", "import-лист1-1-p-683",
  "import-лист1-1-p-687", "import-лист1-1-p-717",
  "import-запчасти-раз-газ-1-p-75",
  "import-запчасти-раз-газ-1-p-123",
  "import-запчасти-раз-газ-1-p-248",
];

const found = await prisma.product.findMany({
  where: { slug: { in: GONE_SLUGS } },
  select: { slug: true, title: true, isActive: true },
});

const foundSlugs = new Set(found.map((p) => p.slug));
const stillMissing = GONE_SLUGS.filter((s) => !foundSlugs.has(s));

console.log(`Из ${GONE_SLUGS.length} "GONE" slug'ов:`);
console.log(`  существуют в проде сейчас: ${found.length}`);
console.log(`  не существуют (true GONE): ${stillMissing.length}`);

if (found.length) {
  console.log(`\nГде ESLI они существуют — но это новые товары под старым URL:`);
  for (const p of found) {
    console.log(`  ${p.slug} (active=${p.isActive}) → "${p.title}"`);
  }
}

console.log(`\nПо-настоящему мёртвые (truly gone):`);
for (const s of stillMissing) console.log(`  ${s}`);

await prisma.$disconnect();
