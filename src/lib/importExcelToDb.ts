import "server-only";

import { prisma } from "@/lib/db";
import { readProductsFromExcel } from "@/lib/excelImport";

export async function importProductsFromExcelToDb(): Promise<{
  processed: number;
  created: number;
  updated: number;
}> {
  const rows = readProductsFromExcel();
  let created = 0;
  let updated = 0;

  for (const p of rows) {
    const existing = await prisma.product.findUnique({
      where: { slug: p.slug },
    });

    if (!existing) {
      await prisma.product.create({
        data: {
          slug: p.slug,
          title: p.title,
          sku: p.sku,
          unit: p.unit,
          qty: p.qty ?? null,
          priceKzt: p.priceKzt ?? null,
          description: p.description,
          category: p.category ?? "Каталог",
          condition: "new",
          fits: [],
          isActive: true,
        },
      });
      created++;
    } else {
      await prisma.product.update({
        where: { slug: p.slug },
        data: {
          title: p.title,
          sku: p.sku,
          unit: p.unit,
          qty: p.qty ?? null,
          priceKzt: p.priceKzt ?? null,
          description: p.description,
          category: p.category ?? existing.category ?? "Каталог",
        },
      });
      updated++;
    }
  }

  return { processed: rows.length, created, updated };
}
