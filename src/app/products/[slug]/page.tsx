import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CarOutlined, RightOutlined } from "@ant-design/icons";
import { getMockProductBySlug } from "@/lib/mockProducts";
import ProductGallery from "./ProductGallery";
import ProductActions from "./ProductActions";
import ProductStickyBar from "./ProductStickyBar";
import ProductReviews from "./ProductReviews";
import CopyButton from "./CopyButton";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getMockProductBySlug(slug);

  if (!product) {
    return {
      title: "Товар не найден | mirzam.kz",
    };
  }

  const siteUrl = getSiteUrl();
  const canonical = `${siteUrl}/products/${encodeURIComponent(product.slug)}`;
  const title = product.sku
    ? `${product.title} — ${product.sku} | mirzam.kz`
    : `${product.title} | mirzam.kz`;
  const description = [
    product.brand,
    product.sku ? `Артикул: ${product.sku}` : undefined,
    `Цена: ${formatPrice(product.priceKzt)} ₸`,
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getMockProductBySlug(slug);
  if (!product) {
    notFound();
  }

  const message = `Здравствуйте! Интересует запчасть: ${product.title}${product.sku ? ` (артикул ${product.sku})` : ""}. Есть в наличии?`;
  const waHref = buildWhatsAppLink(message);

  const gallery = (product.imageUrls?.length ? product.imageUrls : [])
    .filter(Boolean)
    .slice(0, 8);
  const hero = gallery[0] ?? product.imageUrl ?? "/placeholders/part.svg";
  const siteUrl = getSiteUrl();
  const canonical = `${siteUrl}/products/${encodeURIComponent(product.slug)}`;
  const normalizedSku = normalizeSku(product.sku);
  const priceValidUntil = getPriceValidUntil();
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    sku: normalizedSku,
    brand: product.brand
      ? {
          "@type": "Brand",
          name: product.brand,
        }
      : undefined,
    category: product.category,
    image: (gallery.length ? gallery : [hero]).map((src) =>
      toAbsoluteUrl(src, siteUrl),
    ),
    description: product.description,
    offers: {
      "@type": "Offer",
      priceCurrency: "KZT",
      price: String(product.priceKzt),
      priceValidUntil,
      availability:
        product.qty > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      url: canonical,
      itemCondition:
        product.condition === "new"
          ? "https://schema.org/NewCondition"
          : "https://schema.org/UsedCondition",
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingDestination: {
          "@type": "DefinedRegion",
          addressCountry: "KZ",
        },
      },
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "KZ",
        returnPolicyCategory:
          "https://schema.org/MerchantReturnFiniteReturnWindow",
        merchantReturnDays: 14,
        returnMethod: "https://schema.org/ReturnByMail",
      },
    },
  };

  const showSku = product.sku && product.sku.trim() && product.sku !== "—";

  return (
    <main className="space-y-4 max-sm:pb-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />

      {/* Хлебные крошки */}
      <nav
        className="flex animate-fade-up items-center gap-1.5 text-sm text-slate-500"
        aria-label="Навигация"
      >
        <Link href="/" className="transition-colors hover:text-brand">
          Каталог
        </Link>
        {product.category.trim().toLowerCase() !== "каталог" ? (
          <>
            <RightOutlined style={{ fontSize: 9 }} className="text-slate-300" />
            <Link
              href={`/?category=${encodeURIComponent(product.category)}`}
              className="truncate transition-colors hover:text-brand"
            >
              {product.category}
            </Link>
          </>
        ) : null}
      </nav>

      <section className="animate-fade-up overflow-hidden rounded-2xl border border-steel bg-white shadow-card [animation-delay:50ms]">
        <div className="grid gap-5 p-4 sm:p-6 md:grid-cols-[minmax(280px,410px)_1fr] md:items-start">
          <ProductGallery
            images={gallery.length ? gallery : [hero]}
            title={product.title}
          />

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-brand">
                {product.category}
              </span>
              <span
                className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                  product.condition === "new"
                    ? "bg-emerald-500 text-white"
                    : "bg-signal text-ink"
                }`}
              >
                {product.condition === "new" ? "Новая" : "Б/У"}
              </span>
            </div>

            <h1 className="mt-2 text-xl font-bold leading-snug tracking-tight text-ink sm:text-2xl">
              {product.title}
            </h1>

            <div className="mt-2.5 flex flex-wrap items-center gap-2 text-sm text-slate-500">
              {product.brand ? <span>{product.brand}</span> : null}
              {showSku ? (
                <span className="flex items-center gap-1.5">
                  <span className="rounded-md border border-steel bg-paper px-2 py-1 font-mono text-xs text-slate-700">
                    {product.sku}
                  </span>
                  <CopyButton text={product.sku!} />
                </span>
              ) : null}
            </div>

            <div className="mt-4 rounded-xl border border-steel bg-paper p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="text-3xl font-extrabold tabular-nums tracking-tight text-ink">
                  {formatPrice(product.priceKzt)} ₸
                </div>
                {product.qty === 1 ? (
                  <div className="text-xs font-bold uppercase tracking-wide text-signal-deep">
                    последняя на складе
                  </div>
                ) : product.qty > 0 ? (
                  <div className="text-sm text-slate-500">
                    В наличии:{" "}
                    <span className="font-semibold text-ink">
                      {product.qty} шт.
                    </span>
                  </div>
                ) : (
                  <div className="text-sm font-semibold text-slate-400">
                    нет в наличии
                  </div>
                )}
              </div>
              {product.description ? (
                <p className="mt-2.5 border-t border-steel/70 pt-2.5 text-sm leading-relaxed text-slate-600">
                  {product.description}
                </p>
              ) : null}
            </div>

            {/* Инлайн-действия — для десктопа; на мобильных их заменяет липкая нижняя панель */}
            <div className="mt-4 hidden sm:block">
              <ProductActions
                slug={product.slug}
                title={product.title}
                priceKzt={product.priceKzt}
                imageUrl={hero}
                sku={product.sku}
                waHref={waHref}
              />
            </div>

            <div className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-slate-500">
              <CarOutlined style={{ fontSize: 14 }} className="mt-0.5" />
              <span>
                Самовывоз — г. Жезказган. Доставка в другие города Казахстана —
                по договорённости, уточним в WhatsApp.
              </span>
            </div>
          </div>
        </div>
      </section>

      {product.fits.length > 0 ? (
        <section className="animate-fade-up rounded-2xl border border-steel bg-white p-4 shadow-card [animation-delay:100ms] sm:p-5">
          <h2 className="font-display text-sm uppercase tracking-wider text-ink">
            Подходит для
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {product.fits.map((x) => (
              <li
                key={x}
                className="rounded-lg border border-steel bg-paper px-3 py-1.5 text-sm text-slate-700"
              >
                {x}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <ProductReviews productSlug={product.slug} />

      <ProductStickyBar
        slug={product.slug}
        title={product.title}
        priceKzt={product.priceKzt}
        imageUrl={hero}
        sku={product.sku}
        waHref={waHref}
      />
    </main>
  );
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("ru-KZ").format(value);
}

function buildWhatsAppLink(message: string) {
  const phone = "77015221047";
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

function getSiteUrl() {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || "https://mirzam.kz";
  return raw.replace(/\/$/, "");
}

function toAbsoluteUrl(src: string, siteUrl: string) {
  if (!src) return siteUrl;
  if (/^https?:\/\//i.test(src)) return src;
  if (src.startsWith("/")) return `${siteUrl}${src}`;
  return `${siteUrl}/${src}`;
}

function getPriceValidUntil() {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  return date.toISOString().slice(0, 10);
}

// Кириллические буквы, визуально совпадающие с латинскими. В импорте это почти
// всегда опечатка раскладки: «МВ584531» — это Mitsubishi MB584531.
const SKU_HOMOGLYPHS: Record<string, string | undefined> = {
  А: "A",
  В: "B",
  Е: "E",
  К: "K",
  М: "M",
  Н: "H",
  О: "O",
  Р: "P",
  С: "C",
  Т: "T",
  У: "Y",
  Х: "X",
  а: "a",
  е: "e",
  к: "k",
  о: "o",
  р: "p",
  с: "c",
  у: "y",
  х: "x",
};

// Отдельные экземпляры: у глобального regex есть lastIndex, его нельзя
// переиспользовать в .test() внутри цикла.
const CYRILLIC_CHAR = /[Ѐ-ӿ]/;
const CYRILLIC_GLOBAL = /[Ѐ-ӿ]/g;

// Кириллица без латинского двойника (Б, Г, Д, П, Ф, Э…) означает, что артикул
// действительно русский («130-1000102Б», «ДААЗ»), а не набран не в той раскладке.
function hasCyrillicWithoutTwin(value: string) {
  for (const ch of value) {
    if (CYRILLIC_CHAR.test(ch) && SKU_HOMOGLYPHS[ch] === undefined) return true;
  }
  return false;
}

function normalizeSku(sku?: string) {
  const raw = String(sku ?? "").trim();
  if (!raw) return undefined;

  // Skip placeholder values that commonly appear in imports.
  if (/^(?:[\-–—\s]+|n\/a|none|null|нет|б\/н|бн)$/iu.test(raw)) {
    return undefined;
  }

  // If several values are packed into one cell, keep only the first SKU candidate.
  const firstPart = raw.split(/[;,|]+/)[0]?.trim() ?? "";
  if (!firstPart) return undefined;

  const latinized = hasCyrillicWithoutTwin(firstPart)
    ? firstPart
    : firstPart.replace(CYRILLIC_GLOBAL, (ch) => SKU_HOMOGLYPHS[ch] ?? ch);

  // schema.org допускает любой текст в sku, поэтому режем только то, что точно не
  // часть номера. «\» — почти всегда разделитель вариантов, приводим его к «/».
  const normalized = latinized
    .replace(/\\/g, "/")
    .replace(/[^\p{L}\p{N}._/+() -]/gu, "")
    .replace(/\s+/g, " ")
    .trim();

  // Guard against overly short/long and heavily stripped values.
  if (!/[\p{L}\p{N}]/u.test(normalized)) return undefined;
  if (normalized.length < 3 || normalized.length > 70) return undefined;
  if (normalized.length / latinized.length < 0.7) return undefined;

  return normalized;
}
