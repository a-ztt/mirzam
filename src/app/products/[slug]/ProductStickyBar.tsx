"use client";

import AddToCartButton from "@/app/AddToCartButton";
import WhatsAppIcon from "@/app/WhatsAppIcon";

type Props = {
  slug: string;
  title: string;
  priceKzt: number;
  imageUrl?: string;
  sku?: string;
  waHref: string;
};

function formatPrice(value: number) {
  return new Intl.NumberFormat("ru-KZ").format(value);
}

// Липкая панель действий на странице товара — только для мобильных.
// Держит цену и оба главных действия в поле зрения при любом скролле.
export default function ProductStickyBar({
  slug,
  title,
  priceKzt,
  imageUrl,
  sku,
  waHref,
}: Props) {
  return (
    <div className="fixed inset-x-0 bottom-14 z-40 border-t border-steel bg-white/95 px-3 pb-[env(safe-area-inset-bottom)] pt-2.5 shadow-[0_-6px_18px_rgba(18,20,43,0.08)] backdrop-blur sm:hidden">
      <div className="flex items-center gap-2.5">
        <div className="shrink-0 leading-none">
          <div className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
            Цена
          </div>
          <div className="mt-0.5 text-lg font-extrabold tabular-nums text-ink">
            {formatPrice(priceKzt)} ₸
          </div>
        </div>
        <div className="flex flex-1 items-center gap-2">
          <AddToCartButton
            slug={slug}
            title={title}
            priceKzt={priceKzt}
            imageUrl={imageUrl}
            sku={sku}
            size="sm"
          />
          <a
            href={waHref}
            target="_blank"
            rel="noreferrer"
            className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-2 text-[13px] font-bold text-white shadow-sm transition-all active:scale-[0.97]"
          >
            <WhatsAppIcon className="h-4 w-4" />
            WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
