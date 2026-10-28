import "server-only";

import { revalidateTag, unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { publicUploadUrl } from "@/lib/uploads";

type DbProductWithImages = {
  slug: string;
  title: string;
  sku: string | null;
  category: string | null;
  brand: string | null;
  priceKzt: number | null;
  qty: number | null;
  condition: string;
  fits: unknown;
  description: string | null;
  isActive: boolean;
  images: Array<{ path: string }>;
};

export type MockProduct = {
  slug: string;
  title: string;
  imageUrl?: string;
  imageUrls?: string[];
  category: string;
  brand?: string;
  sku?: string;
  priceKzt: number;
  qty: number;
  condition: "new" | "used";
  fits: string[];
  description?: string;
};

const FALLBACK_PRODUCTS: MockProduct[] = [
  {
    slug: "brake-pads-bosch-0986",
    title: "Тормозные колодки передние",
    imageUrl: "/placeholders/part.svg",
    category: "Тормозная система",
    brand: "Bosch",
    sku: "0 986 424 123",
    priceKzt: 16500,
    qty: 3,
    condition: "new",
    fits: ["Toyota Camry 2012–2017 2.0/2.5"],
    description: "Новые колодки. Уточняйте совместимость по VIN.",
  },
  {
    slug: "oil-filter-mann-w-914-2",
    title: "Масляный фильтр",
    imageUrl: "/placeholders/part.svg",
    category: "Фильтры",
    brand: "MANN-FILTER",
    sku: "W 914/2",
    priceKzt: 3200,
    qty: 12,
    condition: "new",
    fits: ["Volkswagen / Audi (разные модели — по каталогу)", "Skoda / SEAT"],
  },
  {
    slug: "headlight-left-used",
    title: "Фара левая (оригинал)",
    imageUrl: "/placeholders/part.svg",
    category: "Оптика",
    brand: "OEM",
    sku: "—",
    priceKzt: 45000,
    qty: 1,
    condition: "used",
    fits: ["Hyundai Sonata 2015–2017"],
    description: "Б/У. Есть небольшие следы эксплуатации.",
  },
  {
    slug: "spark-plugs-ngk-laser",
    title: "Свечи зажигания комплект (4 шт.)",
    imageUrl: "/placeholders/part.svg",
    category: "Двигатель",
    brand: "NGK",
    sku: "LZKR6B-10E",
    priceKzt: 17800,
    qty: 6,
    condition: "new",
    fits: ["Kia Rio 2017–2020 1.6", "Hyundai Solaris 2017–2020 1.6"],
  },
  {
    slug: "shock-absorber-rear",
    title: "Амортизатор задний",
    imageUrl: "/placeholders/part.svg",
    category: "Подвеска",
    brand: "KYB",
    sku: "349025",
    priceKzt: 24500,
    qty: 2,
    condition: "new",
    fits: ["Toyota Corolla 2007–2013"],
  },
];

type ExcelRow = Record<string, unknown>;

const PRODUCTS_TAG = "products";

export function invalidateMockProductsCache() {
  revalidateTag(PRODUCTS_TAG);
}

function safeDecodeSlug(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function getSlugCandidates(slug: string): string[] {
  const out = new Set<string>();

  const add = (value: string) => {
    if (!value) return;
    out.add(value);
    try {
      out.add(decodeURIComponent(value));
    } catch {
      // ignore
    }
    try {
      out.add(encodeURIComponent(value));
    } catch {
      // ignore
    }
  };

  add(slug);
  add(safeDecodeSlug(slug));

  return Array.from(out);
}

async function tryLoadProductsFromDb(): Promise<MockProduct[] | null> {
  try {
    const rows = (await prisma.product.findMany({
      where: { isActive: true },
      include: {
        images: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      },
      orderBy: [{ updatedAt: "desc" }],
      take: 5000,
    })) as DbProductWithImages[];

    if (!rows.length) return null;

    return rows.map((p: DbProductWithImages) => {
      const imageUrls = p.images.map((img: { path: string }) =>
        publicUploadUrl(img.path),
      );
      const imageUrl = imageUrls[0] ?? "/placeholders/part.svg";

      return {
        slug: safeDecodeSlug(p.slug),
        title: p.title,
        imageUrl,
        imageUrls,
        category: p.category ?? "Каталог",
        brand: p.brand ?? undefined,
        sku: p.sku ?? undefined,
        priceKzt: p.priceKzt ?? 0,
        qty: p.qty ?? 0,
        condition: p.condition === "used" ? "used" : "new",
        fits: Array.isArray(p.fits) ? (p.fits as string[]) : [],
        description: p.description ?? undefined,
      };
    });
  } catch {
    return null;
  }
}

function tryLoadProductsFromExcel(): MockProduct[] | null {
  // Avoid bundling `xlsx` into client code. This module is only used from server components.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require("node:fs") as typeof import("node:fs");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const path = require("node:path") as typeof import("node:path");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const XLSX = require("xlsx") as typeof import("xlsx");

  try {
    const excelPath = path.join(process.cwd(), "data", "products.xlsx");
    if (!fs.existsSync(excelPath)) return null;

    const buffer = fs.readFileSync(excelPath);
    const wb = XLSX.read(buffer, { type: "buffer" });
    const firstSheetName = wb.SheetNames[0];
    if (!firstSheetName) return null;
    const ws = wb.Sheets[firstSheetName];
    if (!ws) return null;

    const rows = XLSX.utils.sheet_to_json<ExcelRow>(ws, {
      defval: "",
      raw: false,
    });

    const products: MockProduct[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] ?? {};
      const title = getCellString(row, [
        "Наименование",
        "Наимeнование",
        "Наименование товара",
      ]);
      if (!title) continue;

      const rowNoRaw = getCell(row, ["№", "No", "N", "Номер"]);
      const rowNo =
        typeof rowNoRaw === "number"
          ? rowNoRaw
          : Number.parseInt(String(rowNoRaw ?? ""), 10);
      const stableNo = Number.isFinite(rowNo) ? rowNo : i + 1;

      const sku = getCellString(row, [
        "№ по каталогу",
        "No по каталогу",
        "Номер по каталогу",
        "Артикул",
        "SKU",
      ]);
      const unit = getCellString(row, [
        "Ед.изм",
        "ед.изм",
        "Ед. изм",
        "ед. изм",
        "Ед изм",
        "ед изм",
      ]);
      const qty = parseOptionalIntLike(
        getCell(row, ["К-во", "к-во", "Кол-во", "кол-во", "Количество"]),
      );
      const priceKzt = parseKzt(getCell(row, ["Цена", "цена", "Price"]));
      const sum = parseKzt(getCell(row, ["Сумма", "сумма", "Total"]));

      const descriptionParts: string[] = [];
      if (unit) descriptionParts.push(`Ед. изм.: ${unit}`);
      if (typeof sum === "number") descriptionParts.push(`Сумма: ${sum} ₸`);

      products.push({
        slug: `p-${stableNo}`,
        title,
        imageUrl: "/placeholders/part.svg",
        category: "Каталог",
        sku: sku || undefined,
        priceKzt: typeof priceKzt === "number" ? priceKzt : 0,
        qty: typeof qty === "number" ? qty : 0,
        condition: "new",
        fits: [],
        description: descriptionParts.length
          ? descriptionParts.join(" · ")
          : undefined,
      });
    }

    return products.length ? products : null;
  } catch {
    return null;
  }
}

async function loadProductsOnce(): Promise<MockProduct[] | null> {
  const db = await tryLoadProductsFromDb();
  if (db?.length) return db;
  return tryLoadProductsFromExcel();
}

const getCachedMockProducts = unstable_cache(
  async () => {
    const loaded = await loadProductsOnce();
    return loaded ?? FALLBACK_PRODUCTS;
  },
  ["mock-products-list"],
  { tags: [PRODUCTS_TAG] },
);

const getCachedMockProductBySlug = unstable_cache(
  async (slug: string) => {
    // Prefer DB for up-to-date photos/fields.
    try {
      const slugCandidates = getSlugCandidates(slug);
      const p = (await prisma.product.findFirst({
        where: {
          isActive: true,
          OR: slugCandidates.map((candidate) => ({ slug: candidate })),
        },
        include: {
          images: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
        },
      })) as DbProductWithImages | null;

      if (p) {
        const imageUrls = p.images.map((img: { path: string }) =>
          publicUploadUrl(img.path),
        );
        const imageUrl = imageUrls[0] ?? "/placeholders/part.svg";

        return {
          slug: safeDecodeSlug(p.slug),
          title: p.title,
          imageUrl,
          imageUrls,
          category: p.category ?? "Каталог",
          brand: p.brand ?? undefined,
          sku: p.sku ?? undefined,
          priceKzt: p.priceKzt ?? 0,
          qty: p.qty ?? 0,
          condition: p.condition === "used" ? "used" : "new",
          fits: Array.isArray(p.fits) ? (p.fits as string[]) : [],
          description: p.description ?? undefined,
        } satisfies MockProduct;
      }
    } catch {
      // ignore
    }

    const all = await getCachedMockProducts();
    const candidates = new Set(getSlugCandidates(slug).map(safeDecodeSlug));
    return all.find((x) => candidates.has(safeDecodeSlug(x.slug))) ?? null;
  },
  ["mock-product-by-slug"],
  { tags: [PRODUCTS_TAG] },
);

export async function getMockProducts() {
  return getCachedMockProducts();
}

export async function getMockProductBySlug(slug: string) {
  const product = await getCachedMockProductBySlug(slug);
  return product ?? undefined;
}

export function searchMockProducts(products: MockProduct[], query: string) {
  const q = normalize(query);
  return products.filter((p) => {
    const hay = [p.title, p.category, p.brand ?? "", p.sku ?? "", ...p.fits]
      .map(normalize)
      .join(" ");
    return hay.includes(q);
  });
}

export type CatalogFilters = {
  q?: string;
  category?: string;
  brand?: string;
  condition?: "new" | "used";
  min?: number;
  max?: number;
};

export function filterMockProducts(
  products: MockProduct[],
  filters: CatalogFilters,
) {
  const q = filters.q ? normalize(filters.q) : "";

  return products.filter((p) => {
    if (filters.category && p.category !== filters.category) return false;
    if (filters.brand && (p.brand ?? "") !== filters.brand) return false;
    if (filters.condition && p.condition !== filters.condition) return false;
    if (typeof filters.min === "number" && p.priceKzt < filters.min)
      return false;
    if (typeof filters.max === "number" && p.priceKzt > filters.max)
      return false;

    if (q) {
      const hay = [p.title, p.category, p.brand ?? "", p.sku ?? "", ...p.fits]
        .map(normalize)
        .join(" ");
      if (!hay.includes(q)) return false;
    }

    return true;
  });
}

export function getCatalogFacets(products: MockProduct[]) {
  const categories = new Map<string, number>();
  const brands = new Map<string, number>();

  for (const p of products) {
    categories.set(p.category, (categories.get(p.category) ?? 0) + 1);
    if (p.brand) brands.set(p.brand, (brands.get(p.brand) ?? 0) + 1);
  }

  return {
    categories: Array.from(categories.entries())
      .sort((a, b) => a[0].localeCompare(b[0], "ru"))
      .map(([name, count]) => ({ name, count })),
    brands: Array.from(brands.entries())
      .sort((a, b) => a[0].localeCompare(b[0], "ru"))
      .map(([name, count]) => ({ name, count })),
  };
}

function normalize(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function parseOptionalIntLike(value?: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === "string") {
    const cleaned = value.replace(/\s+/g, "").replace(",", ".");
    const n = Number.parseFloat(cleaned);
    if (!Number.isFinite(n)) return undefined;
    return Math.trunc(n);
  }
  if (value === null || value === undefined || value === "") return undefined;
  const cleaned = String(value).replace(/\s+/g, "").replace(",", ".");
  const n = Number.parseFloat(cleaned);
  if (!Number.isFinite(n)) return undefined;
  return Math.trunc(n);
}

function parseKzt(value?: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? Math.round(value) : undefined;
  }
  if (value === null || value === undefined || value === "") return undefined;
  const cleaned = String(value)
    .replace(/\s+/g, "")
    .replace(/₸/g, "")
    .replace(/,/g, ".")
    .replace(/[^0-9.\-]/g, "");
  if (!cleaned) return undefined;
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? Math.round(n) : undefined;
}

function normalizeHeader(value: string) {
  return value
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/№/g, "no")
    .replace(/[^a-z0-9а-я]+/gi, "")
    .trim();
}

function getCell(row: ExcelRow, keys: string[]) {
  for (const key of keys) {
    if (key in row) return row[key];
  }

  const normalizedMap = new Map<string, unknown>();
  for (const [k, v] of Object.entries(row)) {
    normalizedMap.set(normalizeHeader(k), v);
  }

  for (const key of keys) {
    const v = normalizedMap.get(normalizeHeader(key));
    if (v !== undefined) return v;
  }

  return undefined;
}

function getCellString(row: ExcelRow, keys: string[]) {
  const value = getCell(row, keys);
  return String(value ?? "").trim();
}
