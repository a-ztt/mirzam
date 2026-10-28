import crypto from "node:crypto";
import fs from "node:fs/promises";

import Link from "next/link";
import { redirect } from "next/navigation";
import AdminImagePreview from "./[id]/AdminImagePreview";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { invalidateMockProductsCache } from "@/lib/mockProducts";
import { publicUploadUrl, safeJoinUploadPath } from "@/lib/uploads";

export const runtime = "nodejs";

async function loadDirectoryNames(table: "Category" | "Brand") {
  try {
    if (table === "Category") {
      return await prisma.$queryRaw<Array<{ name: string }>>`
        SELECT "name"
        FROM "Category"
        WHERE "isActive" = true
        ORDER BY "name" ASC
      `;
    }
    return await prisma.$queryRaw<Array<{ name: string }>>`
      SELECT "name"
      FROM "Brand"
      WHERE "isActive" = true
      ORDER BY "name" ASC
    `;
  } catch {
    return [];
  }
}

type SearchParams = {
  q?: string | string[];
  exact?: string | string[];
  category?: string | string[];
  brand?: string | string[];
  active?: string | string[];
  page?: string | string[];
  perPage?: string | string[];
  sort?: string | string[];
};

type PageProps = {
  searchParams?: Promise<SearchParams>;
};

export default async function AdminProductsPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  async function createProductAction() {
    "use server";
    if (!(await getSession())) redirect("/admin/login");

    // Создаём как черновик (isActive=false), чтобы Google не индексировал
    // полупустую карточку с placeholder-слагом "new-XXXX". Админ заполняет
    // данные и явно активирует товар вручную.
    const slug = makeNewProductSlug();
    const product = await prisma.product.create({
      data: {
        title: "Новый товар",
        slug,
        isActive: false,
      },
      select: { id: true },
    });

    invalidateMockProductsCache();

    redirect(`/admin/products/${product.id}`);
  }

  async function deleteProductAction(formData: FormData) {
    "use server";
    if (!(await getSession())) redirect("/admin/login");

    const productId = String(formData.get("productId") ?? "").trim();
    if (!productId) return;

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { images: true },
    });
    if (!product) return;

    await prisma.product.delete({ where: { id: productId } });

    await Promise.all(
      product.images.map(async (img) => {
        try {
          const filePath = safeJoinUploadPath(img.path);
          await fs.unlink(filePath);
        } catch {
          // ignore missing files
        }
      }),
    );

    invalidateMockProductsCache();
  }

  const sp = (await searchParams) ?? {};
  const q = pickFirst(sp.q).trim();
  const exact = pickFirst(sp.exact).trim();
  const isExact = parseBoolean(exact);
  const category = pickFirst(sp.category).trim();
  const brand = pickFirst(sp.brand).trim();
  const active = pickFirst(sp.active).trim();
  const page = parsePositiveInt(pickFirst(sp.page)) ?? 1;

  const perPage = clampPerPage(parsePositiveInt(pickFirst(sp.perPage)));
  const sort = parseSort(pickFirst(sp.sort));

  const PER_PAGE = perPage;

  const baseWhereAnd: Array<Record<string, unknown>> = [];
  if (category) baseWhereAnd.push({ category });
  if (brand) baseWhereAnd.push({ brand });
  if (active === "yes") baseWhereAnd.push({ isActive: true });
  if (active === "no") baseWhereAnd.push({ isActive: false });
  const baseWhere = baseWhereAnd.length ? { AND: baseWhereAnd } : undefined;

  const orderBy = getOrderBy(sort);
  const offset = Math.max(0, (page - 1) * PER_PAGE);

  const [
    allFilteredProducts,
    categoryOptions,
    categoryDirectory,
    brandOptions,
    brandDirectory,
  ] = await Promise.all([
    prisma.product.findMany({
      where: baseWhere,
      orderBy,
      select: {
        id: true,
        title: true,
        slug: true,
        sku: true,
        priceKzt: true,
        qty: true,
        isActive: true,
        category: true,
        brand: true,
      },
    }),
    prisma.product.findMany({
      distinct: ["category"],
      select: { category: true },
    }),
    loadDirectoryNames("Category"),
    prisma.product.findMany({
      distinct: ["brand"],
      select: { brand: true },
    }),
    loadDirectoryNames("Brand"),
  ]);

  const searchedProducts = q
    ? allFilteredProducts.filter((product) =>
        matchesSearch(product, q, isExact),
      )
    : allFilteredProducts;

  const total = searchedProducts.length;
  const pageProducts = searchedProducts.slice(offset, offset + PER_PAGE);
  const pageIds = pageProducts.map((product) => product.id);

  const productsWithImages = pageIds.length
    ? await prisma.product.findMany({
        where: { id: { in: pageIds } },
        select: {
          id: true,
          title: true,
          slug: true,
          sku: true,
          priceKzt: true,
          qty: true,
          isActive: true,
          category: true,
          brand: true,
          images: {
            take: 1,
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
            select: { path: true },
          },
        },
      })
    : [];

  const byId = new Map(
    productsWithImages.map((product) => [product.id, product]),
  );
  const products = pageIds
    .map((id) => byId.get(id))
    .filter(
      (
        product,
      ): product is {
        id: string;
        title: string;
        slug: string;
        sku: string | null;
        priceKzt: number | null;
        qty: number | null;
        isActive: boolean;
        category: string | null;
        brand: string | null;
        images: Array<{ path: string }>;
      } => Boolean(product),
    );

  const categories = buildDirectoryOptions([
    ...categoryDirectory.map((x) => x.name),
    ...categoryOptions
      .map((x) => x.category)
      .filter((x): x is string => typeof x === "string"),
  ]);
  const brands = buildDirectoryOptions([
    ...brandDirectory.map((x) => x.name),
    ...brandOptions
      .map((x) => x.brand)
      .filter((x): x is string => typeof x === "string"),
  ]);

  const maxPage = Math.max(1, Math.ceil(total / PER_PAGE));
  const safePage = Math.min(Math.max(1, page), maxPage);

  // If page param is out of bounds, we keep rendering but clamp navigation to valid range.
  const clearHref = buildHref(
    {
      q,
      exact: isExact,
      category,
      brand,
      active,
      page: safePage,
      perPage: PER_PAGE,
      sort,
    },
    {
      q: "",
      exact: false,
      category: "",
      brand: "",
      active: "",
      page: 1,
      perPage: DEFAULT_PER_PAGE,
      sort: DEFAULT_SORT,
    },
  );

  const activeLabel = active === "yes" ? "Да" : active === "no" ? "Нет" : "Все";

  const productsCount = products.length;
  const from = total === 0 ? 0 : (safePage - 1) * PER_PAGE + 1;
  const to = total === 0 ? 0 : Math.min(safePage * PER_PAGE, total);
  const hasPrev = safePage > 1;
  const hasNext = safePage < maxPage;
  const prevHref = buildHref(
    {
      q,
      exact: isExact,
      category,
      brand,
      active,
      page: safePage,
      perPage: PER_PAGE,
      sort,
    },
    { page: safePage - 1 },
  );
  const nextHref = buildHref(
    {
      q,
      exact: isExact,
      category,
      brand,
      active,
      page: safePage,
      perPage: PER_PAGE,
      sort,
    },
    { page: safePage + 1 },
  );

  const titleSuffix = [
    q ? `поиск: “${q}”` : "",
    category ? `категория: ${category}` : "",
    brand ? `бренд: ${brand}` : "",
    active ? `активен: ${activeLabel}` : "",
    total ? `стр. ${safePage}/${maxPage}` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  const pageTitle = titleSuffix ? `Товары · ${titleSuffix}` : "Товары";

  // NOTE: keep UI minimal; filters are via query params.
  //

  return (
    <main className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold">{pageTitle}</h1>
          <div className="mt-1 text-xs text-slate-600">
            Показано:{" "}
            <span className="font-medium">
              {from}-{to}
            </span>{" "}
            из {total} (по {PER_PAGE} на странице)
          </div>
        </div>
        <div className="flex items-center gap-3">
          <form action={createProductAction}>
            <button className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
              + Добавить товар
            </button>
          </form>
          <Link
            href="/admin"
            className="text-sm text-slate-700 hover:underline"
          >
            ← Назад
          </Link>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-3">
        <form
          action="/admin/products"
          method="get"
          className="flex flex-wrap items-end gap-2"
        >
          <div className="min-w-[240px] flex-1">
            <label className="text-xs font-medium text-slate-700">Поиск</label>
            <input
              name="q"
              defaultValue={q}
              placeholder="Название, slug, артикул…"
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>

          <div className="w-[170px]">
            <label className="text-xs font-medium text-slate-700">Бренд</label>
            <select
              name="brand"
              defaultValue={brand}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            >
              <option value="">Все</option>
              {brands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          <div className="w-[170px]">
            <label className="text-xs font-medium text-slate-700">
              Категория
            </label>
            <select
              name="category"
              defaultValue={category}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            >
              <option value="">Все</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="w-[140px]">
            <label className="text-xs font-medium text-slate-700">
              Активен
            </label>
            <select
              name="active"
              defaultValue={active}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            >
              <option value="">Все</option>
              <option value="yes">Да</option>
              <option value="no">Нет</option>
            </select>
          </div>

          <div className="w-[200px]">
            <label className="text-xs font-medium text-slate-700">
              Сортировка
            </label>
            <select
              name="sort"
              defaultValue={sort}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            >
              <option value="updated-desc">Сначала новые</option>
              <option value="title-asc">Название: А → Я</option>
              <option value="title-desc">Название: Я → А</option>
              <option value="price-asc">Цена: по возрастанию</option>
              <option value="price-desc">Цена: по убыванию</option>
              <option value="qty-asc">Кол-во: по возрастанию</option>
              <option value="qty-desc">Кол-во: по убыванию</option>
            </select>
          </div>

          <div className="w-[170px]">
            <label className="text-xs font-medium text-slate-700">
              Показывать
            </label>
            <select
              name="perPage"
              defaultValue={String(PER_PAGE)}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            >
              {PER_PAGE_OPTIONS.map((n) => (
                <option key={n} value={String(n)}>
                  {n} на странице
                </option>
              ))}
            </select>
          </div>

          <div className="flex h-[42px] w-[170px] items-center gap-2 rounded-md border px-3 py-2">
            <input
              id="exact"
              name="exact"
              type="checkbox"
              value="1"
              defaultChecked={isExact}
              className="h-4 w-4"
            />
            <label
              htmlFor="exact"
              className="text-xs font-medium text-slate-700"
            >
              Точное совпадение
            </label>
          </div>

          <div className="ml-auto flex gap-2">
            <button className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
              Применить
            </button>
            <Link
              href={clearHref}
              className="rounded-md border px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Сбросить
            </Link>
          </div>
        </form>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-600">
            <tr>
              <th className="px-3 py-2">Фото</th>
              <th className="px-3 py-2">Товар</th>
              <th className="px-3 py-2">Цена</th>
              <th className="px-3 py-2">Остаток</th>
              <th className="px-3 py-2">Активен</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {products.length ? (
              products.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="px-3 py-2">
                    <div className="h-12 w-12 overflow-hidden rounded-md bg-slate-100">
                      <AdminImagePreview
                        images={[
                          p.images[0]?.path
                            ? publicUploadUrl(p.images[0].path)
                            : "/placeholders/part.svg",
                        ]}
                        initialIndex={0}
                        title={p.title}
                      />
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium text-slate-900">{p.title}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                      {p.category ? (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700">
                          {p.category}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-3 py-2">{p.priceKzt ?? "—"}</td>
                  <td className="px-3 py-2">{p.qty ?? "—"}</td>
                  <td className="px-3 py-2">{p.isActive ? "Да" : "Нет"}</td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/products/${p.id}`}
                        className="rounded-md border px-3 py-1.5 text-xs hover:bg-slate-50"
                      >
                        Редактировать
                      </Link>
                      <form action={deleteProductAction}>
                        <input type="hidden" name="productId" value={p.id} />
                        <button className="rounded-md border border-rose-200 px-3 py-1.5 text-xs text-rose-700 hover:bg-rose-50">
                          Удалить
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr className="border-t">
                <td
                  className="px-3 py-6 text-center text-sm text-slate-600"
                  colSpan={6}
                >
                  Ничего не найдено
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-600">
          Страница{" "}
          <span className="font-medium text-slate-900">{safePage}</span> из{" "}
          {maxPage}
        </div>
        <div className="flex items-center gap-2">
          {hasPrev ? (
            <Link
              href={prevHref}
              className="rounded-md border px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              ← Назад
            </Link>
          ) : (
            <span className="rounded-md border px-3 py-1.5 text-sm text-slate-400">
              ← Назад
            </span>
          )}

          {hasNext ? (
            <Link
              href={nextHref}
              className="rounded-md border px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              Вперёд →
            </Link>
          ) : (
            <span className="rounded-md border px-3 py-1.5 text-sm text-slate-400">
              Вперёд →
            </span>
          )}
        </div>
      </div>
    </main>
  );
}

function makeNewProductSlug() {
  const id = crypto.randomUUID().replace(/-/g, "").slice(0, 10);
  return `new-${id}`;
}

function pickFirst(v?: string | string[]) {
  if (!v) return "";
  return Array.isArray(v) ? (v[0] ?? "") : v;
}

function buildHref(
  current: {
    q: string;
    exact: boolean;
    category: string;
    brand: string;
    active: string;
    page: number;
    perPage: number;
    sort: SortKey;
  },
  patch: Partial<typeof current>,
) {
  const next = { ...current, ...patch };
  const params = new URLSearchParams();
  if (next.q) params.set("q", next.q);
  if (next.exact) params.set("exact", "1");
  if (next.category) params.set("category", next.category);
  if (next.brand) params.set("brand", next.brand);
  if (next.active) params.set("active", next.active);
  if (next.page && next.page > 1) params.set("page", String(next.page));
  if (next.perPage && next.perPage !== DEFAULT_PER_PAGE)
    params.set("perPage", String(next.perPage));
  if (next.sort && next.sort !== DEFAULT_SORT) params.set("sort", next.sort);
  const qs = params.toString();
  return qs ? `/admin/products?${qs}` : "/admin/products";
}

function parsePositiveInt(v: string) {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function parseBoolean(v: string) {
  const value = v.trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}

type SortKey =
  | "updated-desc"
  | "title-asc"
  | "title-desc"
  | "price-asc"
  | "price-desc"
  | "qty-asc"
  | "qty-desc";

const DEFAULT_SORT: SortKey = "updated-desc";
const DEFAULT_PER_PAGE = 50;
const PER_PAGE_OPTIONS = [25, 50, 100, 200] as const;

function clampPerPage(v?: number) {
  if (typeof v !== "number") return DEFAULT_PER_PAGE;
  if ((PER_PAGE_OPTIONS as readonly number[]).includes(v)) return v;
  // prevent abuse via huge querystring values
  return DEFAULT_PER_PAGE;
}

function parseSort(v: string): SortKey {
  const key = v as SortKey;
  switch (key) {
    case "updated-desc":
    case "title-asc":
    case "title-desc":
    case "price-asc":
    case "price-desc":
    case "qty-asc":
    case "qty-desc":
      return key;
    default:
      return DEFAULT_SORT;
  }
}

function getOrderBy(sort: SortKey) {
  switch (sort) {
    case "title-asc":
      return [{ title: "asc" as const }, { updatedAt: "desc" as const }];
    case "title-desc":
      return [{ title: "desc" as const }, { updatedAt: "desc" as const }];
    case "price-asc":
      return [{ priceKzt: "asc" as const }, { updatedAt: "desc" as const }];
    case "price-desc":
      return [{ priceKzt: "desc" as const }, { updatedAt: "desc" as const }];
    case "qty-asc":
      return [{ qty: "asc" as const }, { updatedAt: "desc" as const }];
    case "qty-desc":
      return [{ qty: "desc" as const }, { updatedAt: "desc" as const }];
    case "updated-desc":
    default:
      return [{ updatedAt: "desc" as const }];
  }
}

function matchesSearch(
  product: {
    title: string;
    slug: string;
    sku: string | null;
    category: string | null;
    brand: string | null;
  },
  query: string,
  isExact: boolean,
) {
  const fields = [
    product.title,
    product.slug,
    product.sku ?? "",
    product.category ?? "",
    product.brand ?? "",
  ].map((value) => value.toLocaleLowerCase("ru-RU"));

  const q = query.toLocaleLowerCase("ru-RU").trim();
  if (!q) return true;

  if (!isExact) {
    if (fields.some((field) => field.includes(q))) return true;

    const tokens = q
      .split(/\s+/)
      .map((token) => token.trim())
      .filter(Boolean);
    if (tokens.length < 2) return false;
    return tokens.every((token) =>
      fields.some((field) => field.includes(token)),
    );
  }

  const tokens = normalizeWords(q);
  if (!tokens.length) return true;

  const fieldWords = fields.map((field) => new Set(normalizeWords(field)));
  return tokens.every((token) => fieldWords.some((words) => words.has(token)));
}

function normalizeWords(value: string) {
  return value
    .toLocaleLowerCase("ru-RU")
    .replace(/[^a-zа-яё0-9]+/giu, " ")
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function isValidDirectoryName(value: string) {
  return Boolean(value) && !value.includes("?") && !value.includes("�");
}

function normalizeDirectoryName(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeDirectoryKey(value: string) {
  return normalizeDirectoryName(value).toLocaleLowerCase("ru-RU");
}

function buildDirectoryOptions(values: string[]) {
  const byKey = new Map<string, string>();

  for (const raw of values) {
    const normalizedName = normalizeDirectoryName(raw);
    if (!isValidDirectoryName(normalizedName)) continue;
    const key = normalizeDirectoryKey(normalizedName);
    if (!byKey.has(key)) byKey.set(key, normalizedName);
  }

  return Array.from(byKey.values()).sort((a, b) => a.localeCompare(b, "ru"));
}
