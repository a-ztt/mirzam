"use client";

import Link from "next/link";
import {
  DeleteOutlined,
  MinusOutlined,
  PlusOutlined,
  ShoppingCartOutlined,
} from "@ant-design/icons";
import { useCart } from "../CartProvider";
import WhatsAppIcon from "../WhatsAppIcon";

function formatPrice(value: number) {
  return new Intl.NumberFormat("ru-KZ").format(value);
}

export default function CartPage() {
  const { items, removeItem, updateQty, clearCart, totalItems, totalPrice } =
    useCart();

  function buildWhatsAppMessage() {
    const lines = items.map(
      (item, idx) =>
        `${idx + 1}. ${item.title}${item.sku ? ` (арт. ${item.sku})` : ""} — ${item.qty} шт. × ${formatPrice(item.priceKzt)} ₸`,
    );
    const total = `\nИтого: ${formatPrice(totalPrice)} ₸ (${totalItems} шт.)`;
    return `Здравствуйте! Хочу заказать:\n\n${lines.join("\n")}${total}`;
  }

  function sendToWhatsApp() {
    const phone = "77015221047";
    const message = buildWhatsAppMessage();
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  if (items.length === 0) {
    return (
      <main>
        <div className="animate-fade-up rounded-2xl border border-steel bg-white px-6 py-16 text-center shadow-card">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-paper text-slate-300">
            <ShoppingCartOutlined style={{ fontSize: 30 }} />
          </div>
          <h1 className="mt-4 font-display text-xl uppercase tracking-wide text-ink">
            Корзина пуста
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
            Добавьте запчасти из каталога — весь заказ уйдёт продавцу одним
            сообщением в WhatsApp.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-lg bg-brand px-6 py-2.5 text-sm font-bold text-white transition-all hover:bg-brand-deep active:scale-[0.98]"
          >
            Перейти в каталог
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="space-y-4 max-sm:pb-16 sm:max-lg:pb-24 lg:pb-0">
      <div className="flex animate-fade-up items-center justify-between gap-3">
        <h1 className="flex items-center gap-2.5 font-display text-xl uppercase tracking-wide text-ink sm:text-2xl">
          Корзина
          <span className="rounded-full bg-brand px-2.5 py-0.5 font-mono text-xs font-bold text-white">
            {totalItems}
          </span>
        </h1>
        <button
          type="button"
          onClick={clearCart}
          className="rounded-lg px-3 py-1.5 text-sm text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
        >
          Очистить
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px] lg:items-start">
        <div className="stagger space-y-2.5">
          {items.map((item) => (
            <div
              key={item.slug}
              className="flex items-center gap-3 rounded-2xl border border-steel bg-white p-3 shadow-card transition-shadow hover:shadow-lift sm:gap-4 sm:p-4"
            >
              <Link
                href={`/products/${item.slug}`}
                className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-steel/60 bg-paper sm:h-20 sm:w-20"
              >
                <img
                  src={item.imageUrl || "/placeholders/part.svg"}
                  alt={item.title}
                  onError={(e) => {
                    const el = e.currentTarget;
                    if (!el.src.endsWith("/placeholders/part.svg")) {
                      el.src = "/placeholders/part.svg";
                    }
                  }}
                  className="h-full w-full object-cover"
                />
              </Link>

              <div className="min-w-0 flex-1">
                <Link
                  href={`/products/${item.slug}`}
                  className="line-clamp-2 text-sm font-semibold leading-snug text-ink transition-colors hover:text-brand sm:text-[15px]"
                >
                  {item.title}
                </Link>
                {item.sku && (
                  <div className="mt-1">
                    <span className="rounded border border-steel bg-paper px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
                      {item.sku}
                    </span>
                  </div>
                )}
                <div className="mt-1.5 text-sm font-extrabold tabular-nums text-ink">
                  {formatPrice(item.priceKzt)} ₸
                  {item.qty > 1 ? (
                    <span className="ml-1.5 text-xs font-medium text-slate-400">
                      × {item.qty} = {formatPrice(item.priceKzt * item.qty)} ₸
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="flex shrink-0 flex-col items-end gap-2.5">
                <button
                  type="button"
                  onClick={() => removeItem(item.slug)}
                  className="rounded-md p-1.5 text-slate-300 transition-colors hover:bg-red-50 hover:text-red-500"
                  aria-label="Удалить из корзины"
                >
                  <DeleteOutlined style={{ fontSize: 15 }} />
                </button>
                <div className="flex items-center overflow-hidden rounded-lg border border-steel">
                  <button
                    type="button"
                    onClick={() => {
                      if (item.qty <= 1) removeItem(item.slug);
                      else updateQty(item.slug, item.qty - 1);
                    }}
                    className="flex h-8 w-8 items-center justify-center text-slate-500 transition-colors hover:bg-paper active:bg-steel/50"
                    aria-label="Уменьшить количество"
                  >
                    <MinusOutlined style={{ fontSize: 11 }} />
                  </button>
                  <span className="w-8 border-x border-steel text-center font-mono text-sm font-semibold leading-8">
                    {item.qty}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateQty(item.slug, item.qty + 1)}
                    className="flex h-8 w-8 items-center justify-center text-slate-500 transition-colors hover:bg-paper active:bg-steel/50"
                    aria-label="Увеличить количество"
                  >
                    <PlusOutlined style={{ fontSize: 11 }} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden animate-fade-up overflow-hidden rounded-2xl bg-ink text-white shadow-plate [animation-delay:100ms] lg:sticky lg:top-24 lg:block">
          <div className="hazard h-1" aria-hidden />
          <div className="p-4 sm:p-5">
            <div className="font-display text-sm uppercase tracking-wider text-slate-400">
              Ваш заказ
            </div>
            <dl className="mt-3 space-y-1.5 text-sm text-slate-300">
              <div className="flex justify-between">
                <dt>Позиций</dt>
                <dd className="font-mono">{items.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Количество</dt>
                <dd className="font-mono">{totalItems} шт.</dd>
              </div>
            </dl>
            <div className="mt-3 flex items-baseline justify-between border-t border-white/10 pt-3">
              <span className="text-sm font-semibold text-white">Итого</span>
              <span className="text-2xl font-extrabold tabular-nums tracking-tight text-signal">
                {formatPrice(totalPrice)} ₸
              </span>
            </div>

            <button
              type="button"
              onClick={sendToWhatsApp}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 text-base font-bold text-white shadow-lg shadow-emerald-600/25 transition-all hover:bg-emerald-500 active:scale-[0.98]"
            >
              <WhatsAppIcon className="h-5 w-5" />
              Отправить заказ в WhatsApp
            </button>

            <p className="mt-3 text-center text-xs leading-relaxed text-slate-400">
              Откроется WhatsApp с готовым списком. Мы подтвердим наличие и
              согласуем оплату и доставку.
            </p>
          </div>
        </div>
      </div>

      {/* Мобильная липкая панель оформления */}
      <div className="fixed inset-x-0 bottom-14 z-40 border-t border-steel bg-white/95 px-3 pb-[env(safe-area-inset-bottom)] pt-2.5 shadow-[0_-6px_18px_rgba(18,20,43,0.1)] backdrop-blur sm:bottom-0 lg:hidden">
        <button
          type="button"
          onClick={sendToWhatsApp}
          className="flex w-full items-center justify-between gap-3 rounded-xl bg-emerald-600 px-4 py-3 text-white shadow-sm transition-all active:scale-[0.99]"
        >
          <span className="flex items-center gap-2 text-sm font-bold">
            <WhatsAppIcon className="h-5 w-5" />
            Заказать в WhatsApp
          </span>
          <span className="text-lg font-extrabold tabular-nums">
            {formatPrice(totalPrice)} ₸
          </span>
        </button>
      </div>
    </main>
  );
}
