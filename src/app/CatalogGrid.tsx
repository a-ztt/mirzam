"use client";

import { useState } from "react";
import Link from "next/link";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import ProductImagePreview from "./ProductImagePreview";
import AddToCartButton from "./AddToCartButton";

type CatalogGridItem = {
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
};

export default function CatalogGrid({ items }: { items: CatalogGridItem[] }) {
  return (
    <div className="stagger grid grid-cols-2 gap-2.5 sm:gap-3.5 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {items.map((item) => (
        <CatalogGridCard key={item.slug} item={item} />
      ))}
    </div>
  );
}

function CatalogGridCard({ item }: { item: CatalogGridItem }) {
  const images = item.imageUrls?.length
    ? item.imageUrls
    : [item.imageUrl ?? "/placeholders/part.svg"];
  const [index, setIndex] = useState(0);

  const prev = () => {
    if (images.length < 2) return;
    setIndex((v) => (v === 0 ? images.length - 1 : v - 1));
  };

  const next = () => {
    if (images.length < 2) return;
    setIndex((v) => (v + 1) % images.length);
  };

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-steel bg-white shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lift">
      <div className="relative overflow-hidden bg-paper group-hover:[&_img]:scale-[1.05]">
        <Link
          href={`/products/${item.slug}`}
          tabIndex={-1}
          aria-label={item.title}
          className="block aspect-[4/3] w-full"
        >
          <ProductImagePreview
            images={images}
            title={item.title}
            initialIndex={index}
          />
        </Link>

        <span
          className={`pointer-events-none absolute left-2 top-2 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide shadow-sm ${
            item.condition === "new"
              ? "bg-emerald-500 text-white"
              : "bg-signal text-ink"
          }`}
        >
          {item.condition === "new" ? "Новая" : "Б/У"}
        </span>

        {images.length > 1 ? (
          <>
            <button
              type="button"
              onClick={prev}
              className="absolute left-2 top-1/2 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-ink/60 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-ink/85 group-hover:opacity-100 sm:flex"
              aria-label="Предыдущее фото"
            >
              <LeftOutlined style={{ fontSize: 12 }} />
            </button>
            <button
              type="button"
              onClick={next}
              className="absolute right-2 top-1/2 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-ink/60 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-ink/85 group-hover:opacity-100 sm:flex"
              aria-label="Следующее фото"
            >
              <RightOutlined style={{ fontSize: 12 }} />
            </button>
            <div className="absolute bottom-2 right-2 rounded-md bg-ink/70 px-1.5 py-0.5 font-mono text-[10px] text-white backdrop-blur-sm">
              {index + 1}/{images.length}
            </div>
          </>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-2.5 sm:p-3">
        <div className="truncate text-[10px] font-bold uppercase tracking-wider text-brand">
          {item.category}
        </div>

        <h2 className="mt-1 line-clamp-2 min-h-[2.6rem] text-sm font-semibold leading-snug text-ink sm:text-[15px] sm:min-h-[2.8rem]">
          <Link
            className="transition-colors hover:text-brand"
            href={`/products/${item.slug}`}
          >
            {item.title}
          </Link>
        </h2>

        <div className="mt-1.5 hidden min-h-[1.5rem] items-center gap-1.5 sm:flex">
          {item.brand ? (
            <span className="truncate text-xs text-slate-500">
              {item.brand}
            </span>
          ) : null}
          {item.sku ? (
            <span className="min-w-0 truncate rounded border border-steel bg-paper px-1.5 py-0.5 font-mono text-[10px] text-slate-600">
              {item.sku}
            </span>
          ) : null}
        </div>

        <div className="mt-auto pt-2.5">
          <div className="flex items-baseline justify-between gap-2">
            <div className="text-base font-extrabold tabular-nums tracking-tight text-ink sm:text-lg">
              {formatPrice(item.priceKzt)} ₸
            </div>
            {item.qty === 1 ? (
              <div className="text-[10px] font-bold uppercase text-signal-deep">
                последняя
              </div>
            ) : item.qty <= 0 ? (
              <div className="text-[11px] text-slate-400">нет в наличии</div>
            ) : (
              <div className="text-[11px] text-slate-400">{item.qty} шт.</div>
            )}
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            <AddToCartButton
              slug={item.slug}
              title={item.title}
              priceKzt={item.priceKzt}
              imageUrl={images[0]}
              sku={item.sku}
            />
            <Link
              href={`/products/${item.slug}`}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-steel text-slate-500 transition-colors hover:border-brand hover:text-brand sm:h-9 sm:w-9"
              aria-label="Открыть карточку товара"
              title="Открыть"
            >
              <RightOutlined style={{ fontSize: 12 }} />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("ru-KZ").format(value);
}
