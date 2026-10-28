import type { Metadata } from "next";
import Link from "next/link";
import {
  FilterOutlined,
  AppstoreOutlined,
  TagsOutlined,
  BarcodeOutlined,
  DollarOutlined,
  UnorderedListOutlined,
  SearchOutlined,
  CloseOutlined,
  RightOutlined,
} from "@ant-design/icons";
import CatalogGrid from "./CatalogGrid";
import ProductImagePreview from "./ProductImagePreview";
import PerPageSelect from "./PerPageSelect";
import FilterSheet from "./FilterSheet";
import ListItemCartButton from "./ListItemCartButton";
import {
  filterMockProducts,
  getCatalogFacets,
  getMockProducts,
} from "@/lib/mockProducts";

type SearchParams = {
  q?: string;
  category?: string;
  brand?: string;
  condition?: "new" | "used";
  min?: string;
  max?: string;
  view?: "grid" | "list";
  page?: string;
  perPage?: string;
};

type PageProps = {
  searchParams?: Promise<SearchParams>;
};

function getSiteUrl() {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || "https://mirzam.kz";
  return raw.replace(/\/$/, "");
}

export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const sp = (await searchParams) ?? {};
  const siteUrl = getSiteUrl();

  // Canonical includes only the category filter — strips view, page, perPage, etc.
  const category = (sp.category ?? "").trim() || undefined;
  const canonicalParams = new URLSearchParams();
  if (category) canonicalParams.set("category", category);
  const qs = canonicalParams.toString();
  const canonical = qs ? `${siteUrl}/?${qs}` : `${siteUrl}/`;

  // Indexable URLs are ONLY "/" and "/?category=X".
  // Anything else (filters, pagination, view/perPage, etc.) collapses to those
  // via the canonical above, and is marked noindex so GSC doesn't surface them
  // as "duplicate, canonical not selected".
  const page = Number.parseInt(sp.page ?? "", 10);
  const hasExtraFilters = !!(
    sp.brand ||
    sp.condition ||
    sp.min ||
    sp.max ||
    sp.q
  );
  const hasViewOrPerPage = !!(sp.view || sp.perPage);
  const hasExplicitPage = sp.page !== undefined;
  const shouldNoIndex =
    (Number.isFinite(page) && page > 1) ||
    hasExtraFilters ||
    hasViewOrPerPage ||
    hasExplicitPage;

  return {
    title: category
      ? `${category} — Автозапчасти | mirzam.kz`
      : "Автозапчасти — распродажа остатков | mirzam.kz",
    description:
      "Каталог автозапчастей в г. Жезказган. Цены и наличие актуальны. Заказ по телефону или WhatsApp.",
    alternates: { canonical },
    ...(shouldNoIndex && {
      robots: { index: false, follow: true },
    }),
  };
}

export default async function Home({ searchParams }: PageProps) {
  const sp = (await searchParams) ?? {};
  const q = (sp.q ?? "").trim();
  const category = (sp.category ?? "").trim() || undefined;
  const brand = (sp.brand ?? "").trim() || undefined;
  const condition = sp.condition || undefined;
  const min = parseOptionalInt(sp.min);
  const max = parseOptionalInt(sp.max);
  const view: "grid" | "list" = sp.view === "list" ? "list" : "grid";
  const perPageOptions = [25, 50, 100, 200];
  const parsedPerPage = parseOptionalInt(sp.perPage);
  const perPage = perPageOptions.includes(parsedPerPage ?? -1)
    ? (parsedPerPage as number)
    : 25;
  const requestedPage = parseOptionalInt(sp.page) ?? 1;

  const all = await getMockProducts();
  const facets = getCatalogFacets(all);
  const items = filterMockProducts(all, {
    q,
    category,
    brand,
    condition,
    min,
    max,
  });

  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  const page = clampInt(requestedPage, 1, totalPages);
  const start = (page - 1) * perPage;
  const pagedItems = items.slice(start, start + perPage);
  const compactPages = getCompactPages(page, totalPages);

  const hasFilters = !!(q || category || brand || condition || min || max);
  // Счётчик для бейджа шторки — поиск (q) считается отдельно, он в строке поиска.
  const activeCount = [
    category,
    brand,
    condition,
    min !== undefined || max !== undefined ? "price" : "",
  ].filter(Boolean).length;
  const today = new Intl.DateTimeFormat("ru-KZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date());

  const activeParams = {
    q,
    category,
    brand,
    condition,
    min,
    max,
    view,
    page,
    perPage,
  };
  const clearHref = buildHref(activeParams, {
    q: "",
    category: undefined,
    brand: undefined,
    condition: undefined,
    min: undefined,
    max: undefined,
    page: 1,
  });

  return (
    <main className="space-y-4">
      {/* Герой — «заводская табличка» склада */}
      <section className="relative animate-fade-up overflow-hidden rounded-2xl border border-ink-line bg-ink text-white shadow-plate">
        <PlateScrews />
        <TechDrawing />
        <div className="relative p-4 sm:p-6">
          <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-signal sm:text-[11px]">
            mirzam.kz · Жезказган
          </div>
          <h1 className="mt-1.5 font-display text-xl uppercase leading-tight tracking-wide sm:mt-2 sm:text-4xl">
            {category ?? "Распродажа остатков"}
          </h1>
          <p className="mt-1.5 line-clamp-2 max-w-xl text-[13px] leading-relaxed text-slate-300 sm:mt-2 sm:line-clamp-none sm:text-[15px]">
            Автозапчасти со склада — новые и б/у. Цена и остаток у каждой
            позиции реальные на сегодня. Заказ уходит продавцу одним сообщением
            в WhatsApp.
          </p>
          <dl className="mt-3 flex flex-wrap gap-y-3 border-t border-white/10 pt-3 sm:mt-4 sm:pt-3.5">
            <PlateFact label="В наличии" value={`${all.length} поз.`} first />
            <PlateFact
              label="Разделов"
              value={String(facets.categories.length)}
            />
            <PlateFact label="Обновлено" value={today} accent />
            <PlateFact label="Заказ" value="WhatsApp / телефон" wide />
          </dl>
        </div>
      </section>

      {/* Мобильная/планшетная липкая панель: поиск по артикулу + шторка фильтров */}
      <div className="sticky top-[85px] z-30 -mx-4 border-b border-steel bg-paper/95 px-4 py-2.5 backdrop-blur sm:-mx-6 sm:px-6 lg:hidden">
        <form action="/" method="get">
          <input type="hidden" name="category" value={category ?? ""} />
          <input type="hidden" name="brand" value={brand ?? ""} />
          <input type="hidden" name="condition" value={condition ?? ""} />
          <input type="hidden" name="min" value={min ?? ""} />
          <input type="hidden" name="max" value={max ?? ""} />
          <input type="hidden" name="view" value={view} />
          <input type="hidden" name="perPage" value={perPage} />
          <input type="hidden" name="page" value={1} />
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
              <SearchOutlined style={{ fontSize: 16 }} />
            </span>
            <input
              name="q"
              defaultValue={q}
              enterKeyHint="search"
              placeholder="Артикул, бренд, модель…"
              className="h-11 w-full rounded-xl border border-steel bg-white pl-10 pr-3 text-[15px] text-ink outline-none transition-colors placeholder:text-slate-400 focus:border-brand"
            />
          </div>
        </form>
        <div className="mt-2 flex items-center gap-2">
          <FilterSheet activeCount={activeCount} clearHref={clearHref}>
            <FilterForm
              view={view}
              perPage={perPage}
              category={category}
              condition={condition}
              brand={brand}
              min={min}
              max={max}
              facets={facets}
            />
          </FilterSheet>
          <Link
            href={buildHref(activeParams, {
              view: view === "grid" ? "list" : "grid",
            })}
            aria-label={
              view === "grid" ? "Показать списком" : "Показать плиткой"
            }
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-steel bg-white text-slate-500 shadow-card transition-colors active:bg-paper"
          >
            {view === "grid" ? (
              <UnorderedListOutlined style={{ fontSize: 17 }} />
            ) : (
              <AppstoreOutlined style={{ fontSize: 17 }} />
            )}
          </Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[264px_1fr]">
        <aside className="hidden min-w-0 lg:sticky lg:top-24 lg:block lg:self-start">
          <div className="rounded-2xl border border-steel bg-white p-4 shadow-card">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 font-display text-sm uppercase tracking-wider text-ink">
                <FilterOutlined style={{ fontSize: 16 }} /> Фильтры
              </div>
              {hasFilters ? (
                <Link
                  href={clearHref}
                  className="text-xs font-semibold text-brand transition-colors hover:text-brand-deep"
                >
                  Сбросить
                </Link>
              ) : null}
            </div>
            <div className="mt-3">
              <FilterForm
                view={view}
                perPage={perPage}
                category={category}
                condition={condition}
                brand={brand}
                min={min}
                max={max}
                facets={facets}
              />
            </div>
          </div>
        </aside>

        <section className="min-w-0 space-y-4">
          {/* Мобильная строка результатов + активные фильтры */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm lg:hidden">
            <div className="shrink-0 font-medium text-slate-500">
              Найдено{" "}
              <span className="font-bold text-ink">{items.length}</span>
            </div>
            {hasFilters ? (
              <div className="flex flex-wrap items-center gap-1.5">
                {q ? (
                  <FilterChip
                    label={`«${q}»`}
                    href={buildHref(activeParams, { q: "", page: 1 })}
                  />
                ) : null}
                {category ? (
                  <FilterChip
                    label={category}
                    href={buildHref(activeParams, {
                      category: undefined,
                      page: 1,
                    })}
                  />
                ) : null}
                {brand ? (
                  <FilterChip
                    label={brand}
                    href={buildHref(activeParams, { brand: undefined, page: 1 })}
                  />
                ) : null}
                {condition ? (
                  <FilterChip
                    label={condition === "new" ? "Новая" : "Б/У"}
                    href={buildHref(activeParams, {
                      condition: undefined,
                      page: 1,
                    })}
                  />
                ) : null}
                {min !== undefined || max !== undefined ? (
                  <FilterChip
                    label={`${min !== undefined ? `от ${formatPrice(min)}` : ""}${
                      min !== undefined && max !== undefined ? " " : ""
                    }${max !== undefined ? `до ${formatPrice(max)}` : ""} ₸`}
                    href={buildHref(activeParams, {
                      min: undefined,
                      max: undefined,
                      page: 1,
                    })}
                  />
                ) : null}
              </div>
            ) : null}
          </div>

          {/* Десктопный тулбар */}
          <div className="hidden animate-fade-up rounded-2xl border border-steel bg-white p-3 shadow-card [animation-delay:60ms] lg:block lg:p-4">
            <div className="flex flex-wrap items-center gap-3">
              <form
                action="/"
                method="get"
                className="w-full min-w-0 sm:w-auto sm:min-w-[240px] sm:max-w-md sm:flex-1"
              >
                <input type="hidden" name="category" value={category ?? ""} />
                <input type="hidden" name="brand" value={brand ?? ""} />
                <input type="hidden" name="condition" value={condition ?? ""} />
                <input type="hidden" name="min" value={min ?? ""} />
                <input type="hidden" name="max" value={max ?? ""} />
                <input type="hidden" name="view" value={view} />
                <input type="hidden" name="perPage" value={perPage} />
                <input type="hidden" name="page" value={1} />
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                    <SearchOutlined style={{ fontSize: 15 }} />
                  </span>
                  <input
                    name="q"
                    defaultValue={q}
                    placeholder="Артикул, бренд, модель…"
                    className="w-full rounded-xl border border-steel bg-paper py-2.5 pl-9 pr-3 text-sm text-ink outline-none transition-colors placeholder:text-slate-400 focus:border-brand focus:bg-white"
                  />
                </div>
              </form>

              <div className="ml-auto flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-0.5 rounded-lg border border-steel bg-paper p-1">
                  <Link
                    href={buildHref(activeParams, { view: "grid" })}
                    className={
                      view === "grid"
                        ? "rounded-md bg-white px-2.5 py-1.5 text-brand shadow-card"
                        : "rounded-md px-2.5 py-1.5 text-slate-400 transition-colors hover:text-slate-600"
                    }
                    aria-label="Плитки"
                    title="Плитки"
                  >
                    <AppstoreOutlined style={{ fontSize: 16 }} />
                  </Link>
                  <Link
                    href={buildHref(activeParams, { view: "list" })}
                    className={
                      view === "list"
                        ? "rounded-md bg-white px-2.5 py-1.5 text-brand shadow-card"
                        : "rounded-md px-2.5 py-1.5 text-slate-400 transition-colors hover:text-slate-600"
                    }
                    aria-label="Список"
                    title="Список"
                  >
                    <UnorderedListOutlined style={{ fontSize: 16 }} />
                  </Link>
                </div>

                <PerPageSelect
                  options={perPageOptions}
                  value={perPage}
                  hiddenFields={{
                    q: q,
                    category: category ?? "",
                    brand: brand ?? "",
                    condition: condition ?? "",
                    min: min ?? "",
                    max: max ?? "",
                    view,
                  }}
                />
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-steel/60 pt-3 text-sm">
              <div className="shrink-0 text-slate-500">
                Показано{" "}
                <span className="font-bold text-ink">{pagedItems.length}</span>{" "}
                из {items.length}
                {hasFilters ? (
                  <span className="text-slate-400"> (всего {all.length})</span>
                ) : null}
              </div>

              {hasFilters ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  {q ? (
                    <FilterChip
                      label={`«${q}»`}
                      href={buildHref(activeParams, { q: "", page: 1 })}
                    />
                  ) : null}
                  {category ? (
                    <FilterChip
                      label={category}
                      href={buildHref(activeParams, {
                        category: undefined,
                        page: 1,
                      })}
                    />
                  ) : null}
                  {brand ? (
                    <FilterChip
                      label={brand}
                      href={buildHref(activeParams, {
                        brand: undefined,
                        page: 1,
                      })}
                    />
                  ) : null}
                  {condition ? (
                    <FilterChip
                      label={condition === "new" ? "Новая" : "Б/У"}
                      href={buildHref(activeParams, {
                        condition: undefined,
                        page: 1,
                      })}
                    />
                  ) : null}
                  {min !== undefined || max !== undefined ? (
                    <FilterChip
                      label={`${min !== undefined ? `от ${formatPrice(min)}` : ""}${
                        min !== undefined && max !== undefined ? " " : ""
                      }${max !== undefined ? `до ${formatPrice(max)}` : ""} ₸`}
                      href={buildHref(activeParams, {
                        min: undefined,
                        max: undefined,
                        page: 1,
                      })}
                    />
                  ) : null}
                </div>
              ) : null}

              {totalPages > 1 ? (
                <div className="ml-auto">
                  <Pagination
                    items={compactPages}
                    page={page}
                    hrefFor={(p) => buildHref(activeParams, { page: p })}
                  />
                </div>
              ) : null}
            </div>
          </div>

          {pagedItems.length === 0 ? (
            <EmptyState clearHref={clearHref} hasFilters={hasFilters} />
          ) : view === "list" ? (
            <div className="min-w-0 animate-fade-up overflow-hidden rounded-2xl border border-steel bg-white shadow-card [animation-delay:120ms]">
              {/* Мобильный список — карточки */}
              <div className="stagger divide-y divide-steel/60 sm:hidden">
                {pagedItems.map((p) => (
                  <Link
                    key={p.slug}
                    href={`/products/${p.slug}`}
                    className="flex items-center gap-3 px-3 py-3 transition-colors active:bg-paper"
                  >
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-paper">
                      <ProductImagePreview
                        images={
                          p.imageUrls?.length
                            ? p.imageUrls
                            : [p.imageUrl ?? "/placeholders/part.svg"]
                        }
                        title={p.title}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="line-clamp-2 text-sm font-semibold leading-snug text-ink">
                        {p.title}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                        <ConditionPill condition={p.condition} />
                        {p.sku ? (
                          <span className="truncate font-mono text-slate-500">
                            {p.sku}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1 text-sm font-extrabold tabular-nums text-ink">
                        {formatPrice(p.priceKzt)} ₸
                      </div>
                    </div>
                    <RightOutlined
                      style={{ fontSize: 12 }}
                      className="shrink-0 text-slate-300"
                    />
                  </Link>
                ))}
              </div>
              {/* Десктопный список — таблица */}
              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full text-sm">
                  <thead className="bg-paper text-left font-mono text-[10px] uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-3 py-2.5 font-medium">Фото</th>
                      <th className="px-3 py-2.5 font-medium">Товар</th>
                      <th className="px-3 py-2.5 font-medium">Цена</th>
                      <th className="px-3 py-2.5 font-medium">Остаток</th>
                      <th className="px-3 py-2.5" />
                    </tr>
                  </thead>
                  <tbody className="stagger">
                    {pagedItems.map((p) => (
                      <tr
                        key={p.slug}
                        className="border-t border-steel/60 transition-colors hover:bg-brand-soft/30"
                      >
                        <td className="px-3 py-2.5">
                          <Link
                            href={`/products/${p.slug}`}
                            tabIndex={-1}
                            aria-label={p.title}
                            className="relative block h-14 w-14 overflow-hidden rounded-lg bg-paper"
                          >
                            <ProductImagePreview
                              images={
                                p.imageUrls?.length
                                  ? p.imageUrls
                                  : [p.imageUrl ?? "/placeholders/part.svg"]
                              }
                              title={p.title}
                            />
                          </Link>
                        </td>
                        <td className="px-3 py-2.5">
                          <h2 className="font-semibold text-ink">
                            <Link
                              className="transition-colors hover:text-brand"
                              href={`/products/${p.slug}`}
                            >
                              {p.title}
                            </Link>
                          </h2>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <ConditionPill condition={p.condition} />
                            <span className="text-slate-400">{p.category}</span>
                            {p.brand ? <span>{p.brand}</span> : null}
                            {p.sku ? (
                              <span className="rounded border border-steel bg-paper px-1.5 py-0.5 font-mono text-[11px] text-slate-600">
                                {p.sku}
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 font-extrabold tabular-nums text-ink">
                          {formatPrice(p.priceKzt)} ₸
                        </td>
                        <td className="px-3 py-2.5">
                          <QtyLabel qty={p.qty} />
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <ListItemCartButton
                              slug={p.slug}
                              title={p.title}
                              priceKzt={p.priceKzt}
                              imageUrl={p.imageUrls?.[0] ?? p.imageUrl}
                              sku={p.sku}
                            />
                            <Link
                              href={`/products/${p.slug}`}
                              className="rounded-lg border border-steel px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-brand hover:text-brand"
                            >
                              Открыть
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <CatalogGrid items={pagedItems} />
          )}

          {totalPages > 1 ? (
            <div className="flex flex-col items-center gap-2 pt-1">
              <Pagination
                items={compactPages}
                page={page}
                hrefFor={(p) => buildHref(activeParams, { page: p })}
              />
              <div className="text-xs text-slate-400">
                Страница {page} из {totalPages}
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

/* ── Детали «заводской таблички» ─────────────────────────── */

function PlateFact({
  label,
  value,
  first,
  accent,
  wide,
}: {
  label: string;
  value: string;
  first?: boolean;
  accent?: boolean;
  wide?: boolean;
}) {
  return (
    <div
      className={`${first ? "" : "border-l border-white/10 pl-4 sm:pl-6"} ${
        wide ? "hidden md:block" : ""
      } pr-4 sm:pr-6`}
    >
      <dt className="font-mono text-[9px] uppercase tracking-[0.18em] text-slate-500 sm:text-[10px]">
        {label}
      </dt>
      <dd
        className={`mt-0.5 font-mono text-xs font-semibold sm:text-sm ${
          accent ? "text-signal" : "text-white"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function PlateScrews() {
  const spot =
    "absolute size-1.5 rounded-full bg-white/20 shadow-[inset_0_1px_1px_rgba(0,0,0,0.7)]";
  return (
    <>
      <span aria-hidden className={`${spot} left-2.5 top-2.5`} />
      <span aria-hidden className={`${spot} right-2.5 top-2.5`} />
      <span aria-hidden className={`${spot} bottom-2.5 left-2.5`} />
      <span aria-hidden className={`${spot} bottom-2.5 right-2.5`} />
    </>
  );
}

function TechDrawing() {
  const ticks = Array.from({ length: 24 }, (_, i) => {
    const a = (i * Math.PI) / 12;
    return {
      x1: 100 + Math.cos(a) * 74,
      y1: 100 + Math.sin(a) * 74,
      x2: 100 + Math.cos(a) * 84,
      y2: 100 + Math.sin(a) * 84,
    };
  });
  return (
    <svg
      aria-hidden
      viewBox="0 0 200 200"
      fill="none"
      stroke="currentColor"
      className="pointer-events-none absolute -right-14 -top-20 hidden h-[320px] w-[320px] text-white/[0.07] md:block"
    >
      <circle cx="100" cy="100" r="88" strokeWidth="1" />
      <circle cx="100" cy="100" r="62" strokeWidth="1" strokeDasharray="3 7" />
      <circle cx="100" cy="100" r="30" strokeWidth="1" />
      <circle cx="100" cy="100" r="7" strokeWidth="1.5" />
      <line x1="100" y1="4" x2="100" y2="196" strokeWidth="0.5" />
      <line x1="4" y1="100" x2="196" y2="100" strokeWidth="0.5" />
      {ticks.map((t, i) => (
        <line key={i} {...t} strokeWidth="1" />
      ))}
    </svg>
  );
}

/* ── Форма фильтров (общая для сайдбара и мобильной шторки) ─ */

type Facets = {
  categories: Array<{ name: string; count: number }>;
  brands: Array<{ name: string; count?: number }>;
};

function FilterForm({
  view,
  perPage,
  category,
  condition,
  brand,
  min,
  max,
  facets,
}: {
  view: "grid" | "list";
  perPage: number;
  category?: string;
  condition?: "new" | "used";
  brand?: string;
  min?: number;
  max?: number;
  facets: Facets;
}) {
  const field =
    "mt-1.5 w-full cursor-pointer rounded-lg border border-steel bg-white px-3 py-2.5 text-sm outline-none transition-colors hover:border-slate-300 focus:border-brand sm:py-2";
  return (
    <form action="/" method="get" className="space-y-3.5">
      <input type="hidden" name="view" value={view} />
      <input type="hidden" name="perPage" value={perPage} />
      <input type="hidden" name="page" value={1} />

      <div>
        <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
          <AppstoreOutlined style={{ fontSize: 14 }} /> Категория
        </label>
        <select name="category" defaultValue={category ?? ""} className={field}>
          <option value="">Все разделы</option>
          {facets.categories.map((c) => (
            <option key={c.name} value={c.name}>
              {c.name} ({c.count})
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
            <TagsOutlined style={{ fontSize: 14 }} /> Состояние
          </label>
          <select
            name="condition"
            defaultValue={condition ?? ""}
            className={field}
          >
            <option value="">Любое</option>
            <option value="new">Новая</option>
            <option value="used">Б/У</option>
          </select>
        </div>
        <div>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
            <BarcodeOutlined style={{ fontSize: 14 }} /> Бренд
          </label>
          <select name="brand" defaultValue={brand ?? ""} className={field}>
            <option value="">Любой</option>
            {facets.brands.map((b) => (
              <option key={b.name} value={b.name}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
          <DollarOutlined style={{ fontSize: 14 }} /> Цена, ₸
        </div>
        <div className="mt-1.5 grid grid-cols-2 gap-2.5">
          <input
            name="min"
            inputMode="numeric"
            defaultValue={min ?? ""}
            placeholder="от"
            className="w-full rounded-lg border border-steel bg-white px-3 py-2.5 text-sm outline-none transition-colors hover:border-slate-300 focus:border-brand sm:py-2"
          />
          <input
            name="max"
            inputMode="numeric"
            defaultValue={max ?? ""}
            placeholder="до"
            className="w-full rounded-lg border border-steel bg-white px-3 py-2.5 text-sm outline-none transition-colors hover:border-slate-300 focus:border-brand sm:py-2"
          />
        </div>
      </div>

      <button className="w-full rounded-lg bg-brand px-4 py-3 text-sm font-bold text-white shadow-sm transition-all hover:bg-brand-deep active:scale-[0.98] sm:py-2.5">
        Показать результаты
      </button>

      <div className="rounded-lg border border-steel/70 bg-paper p-3 text-xs leading-relaxed text-slate-500">
        Не уверены в совместимости? Отправьте VIN или марку авто в WhatsApp —
        подберём и подтвердим наличие.
      </div>
    </form>
  );
}

/* ── Элементы тулбара ────────────────────────────────────── */

function FilterChip({ label, href }: { label: string; href: string }) {
  return (
    <Link
      href={href}
      className="inline-flex max-w-[220px] items-center gap-1.5 rounded-full border border-brand-border bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand-dark transition-colors hover:border-brand"
      title="Убрать фильтр"
    >
      <span className="truncate">{label}</span>
      <CloseOutlined style={{ fontSize: 9 }} />
    </Link>
  );
}

function Pagination({
  items,
  page,
  hrefFor,
}: {
  items: Array<number | "dots">;
  page: number;
  hrefFor: (p: number) => string;
}) {
  return (
    <nav className="flex items-center gap-1" aria-label="Страницы">
      {items.map((item, idx) =>
        item === "dots" ? (
          <span key={`dots-${idx}`} className="px-1.5 text-slate-400">
            …
          </span>
        ) : (
          <Link
            key={item}
            href={hrefFor(item)}
            aria-current={item === page ? "page" : undefined}
            className={
              item === page
                ? "rounded-lg border border-brand bg-brand px-3 py-1.5 text-sm font-bold text-white"
                : "rounded-lg border border-steel bg-white px-3 py-1.5 text-sm text-slate-600 transition-colors hover:border-brand hover:text-brand"
            }
          >
            {item}
          </Link>
        ),
      )}
    </nav>
  );
}

function ConditionPill({ condition }: { condition: "new" | "used" }) {
  return condition === "new" ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200/70">
      Новая
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-signal-soft px-2 py-0.5 text-[11px] font-semibold text-signal-deep ring-1 ring-inset ring-signal/40">
      Б/У
    </span>
  );
}

function QtyLabel({ qty }: { qty: number }) {
  if (qty <= 0) {
    return <span className="text-xs text-slate-400">нет</span>;
  }
  if (qty === 1) {
    return (
      <span className="text-xs font-semibold text-signal-deep">последняя</span>
    );
  }
  return <span className="text-sm tabular-nums text-slate-600">{qty} шт.</span>;
}

function EmptyState({
  clearHref,
  hasFilters,
}: {
  clearHref: string;
  hasFilters: boolean;
}) {
  return (
    <div className="animate-fade-up rounded-2xl border border-steel bg-white px-6 py-16 text-center shadow-card">
      <SearchOutlined style={{ fontSize: 44 }} className="text-slate-300" />
      <div className="mt-4 font-display text-lg uppercase tracking-wide text-ink">
        Ничего не найдено
      </div>
      <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
        По этим условиям деталей на складе нет. Попробуйте убрать часть
        фильтров или напишите нам — проверим вручную.
      </p>
      {hasFilters ? (
        <Link
          href={clearHref}
          className="mt-5 inline-block rounded-lg bg-brand px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-brand-deep active:scale-[0.98]"
        >
          Сбросить фильтры
        </Link>
      ) : null}
    </div>
  );
}

/* ── Утилиты ─────────────────────────────────────────────── */

function formatPrice(value: number) {
  return new Intl.NumberFormat("ru-KZ").format(value);
}

function parseOptionalInt(value?: string) {
  if (!value) return undefined;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : undefined;
}

function clampInt(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getCompactPages(page: number, total: number): Array<number | "dots"> {
  if (total <= 6) return Array.from({ length: total }, (_, i) => i + 1);

  if (page <= 3) {
    return [1, 2, 3, 4, "dots", total];
  }

  if (page >= total - 2) {
    return [1, "dots", total - 3, total - 2, total - 1, total];
  }

  return [1, "dots", page - 1, page, page + 1, "dots", total];
}

function buildHref(
  current: {
    q?: string;
    category?: string;
    brand?: string;
    condition?: "new" | "used";
    min?: number;
    max?: number;
    view?: "grid" | "list";
    page?: number;
    perPage?: number;
  },
  patch: Partial<typeof current>,
) {
  const next = { ...current, ...patch };
  const params = new URLSearchParams();

  if (next.q) params.set("q", next.q);
  if (next.category) params.set("category", next.category);
  if (next.brand) params.set("brand", next.brand);
  if (next.condition) params.set("condition", next.condition);
  if (typeof next.min === "number") params.set("min", String(next.min));
  if (typeof next.max === "number") params.set("max", String(next.max));
  if (next.view) params.set("view", next.view);
  if (typeof next.page === "number") params.set("page", String(next.page));
  if (typeof next.perPage === "number")
    params.set("perPage", String(next.perPage));

  const qs = params.toString();
  return qs ? `/?${qs}` : "/";
}
