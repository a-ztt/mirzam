import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import Image from "next/image";

import { CartProvider } from "./CartProvider";
import { jetbrainsMono, manrope, tektur } from "./fonts";
import HeaderNav from "./HeaderNav";
import CartBadge from "./CartBadge";
import MobileBottomNav from "./MobileBottomNav";
import FloatingWhatsApp from "./FloatingWhatsApp";
import TodayDate from "./TodayDate";
import { formatToday } from "./today";

export const metadata: Metadata = {
  title: "Автозапчасти — распродажа остатков",
  description:
    "Каталог автозапчастей в г. Жезказган. Цены и наличие актуальны на текущую дату. Список товаров пополняется ежедневно. Заказ по телефону или WhatsApp, доставка в другие города по договоренности.",
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", type: "image/x-icon" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      {
        url: "/android-chrome-192x192.png",
        type: "image/png",
        sizes: "192x192",
      },
      {
        url: "/android-chrome-512x512.png",
        type: "image/png",
        sizes: "512x512",
      },
    ],
    apple: [{ url: "/apple-touch-icon.png", type: "image/png" }],
    shortcut: [{ url: "/favicon.ico", type: "image/x-icon" }],
  },
};

const PHONE_DISPLAY = "+7 701 522 10 47";
const PHONE_TEL = "+77015221047";
const WA_HREF = `https://wa.me/77015221047?text=${encodeURIComponent(
  "Здравствуйте! Хочу уточнить наличие запчасти.",
)}`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const today = formatToday();

  return (
    <html
      lang="ru"
      className={`${manrope.variable} ${tektur.variable} ${jetbrainsMono.variable}`}
    >
      <body className="flex min-h-screen flex-col bg-paper font-sans text-ink">
        <CartProvider>
          <header className="sticky top-0 z-50 bg-ink text-white shadow-lg shadow-ink/20">
            {/* Тонкая предупреждающая лента — фирменная деталь */}
            <div className="hazard h-1" aria-hidden />
            <div className="mx-auto flex w-full max-w-[1700px] items-center justify-between gap-3 px-4 py-2.5 sm:px-6 lg:px-8">
              <Link
                href="/"
                className="flex shrink-0 items-center gap-2 transition-opacity hover:opacity-90"
              >
                <Image
                  src="/mirzam-mark.svg"
                  alt="mirzam.kz"
                  width={36}
                  height={36}
                  className="size-9 sm:hidden"
                  priority
                />
                <Image
                  src="/mirzam-full.svg"
                  alt="mirzam.kz"
                  width={126}
                  height={52}
                  className="hidden h-9 w-auto sm:block"
                  priority
                />
              </Link>
              <div className="flex items-center">
                <HeaderNav />
                <CartBadge />
              </div>
            </div>
            {/* Строка актуальности — «живой» статус склада */}
            <div className="border-t border-ink-line bg-ink-soft/80">
              <div className="mx-auto flex w-full max-w-[1700px] items-center gap-2 px-4 py-1.5 text-[11px] text-slate-300 sm:px-6 sm:text-xs lg:px-8">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping-soft rounded-full bg-emerald-400" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                <span className="truncate">
                  Наличие и цены актуальны на{" "}
                  <TodayDate
                    initial={today}
                    className="font-mono font-medium text-white"
                  />
                  <span className="hidden sm:inline">
                    {" "}
                    · г. Жезказган · каталог пополняется ежедневно
                  </span>
                </span>
              </div>
            </div>
          </header>

          <div className="mx-auto w-full max-w-[1700px] flex-1 px-4 pb-20 pt-4 sm:px-6 sm:pb-8 sm:pt-6 lg:px-16">
            {children}
          </div>

          <footer className="shrink-0 bg-ink pb-16 text-slate-300 sm:pb-0">
            <div className="hazard h-1" aria-hidden />
            <div className="mx-auto w-full max-w-[1700px] px-4 py-8 sm:px-6 lg:px-8">
              <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <Image
                    src="/mirzam-full.svg"
                    alt="mirzam.kz"
                    width={126}
                    height={52}
                    className="h-9 w-auto"
                  />
                  <p className="mt-3 max-w-xs text-sm leading-relaxed text-slate-400">
                    Распродажа складских остатков автозапчастей в Жезказгане.
                    Новые и б/у детали, наличие обновляется ежедневно.
                  </p>
                </div>
                <div>
                  <div className="font-display text-sm uppercase tracking-wider text-slate-400">
                    Разделы
                  </div>
                  <nav className="mt-3 grid gap-2 text-sm">
                    <Link
                      href="/"
                      className="w-fit transition-colors hover:text-white"
                    >
                      Каталог
                    </Link>
                    <Link
                      href="/cart"
                      className="w-fit transition-colors hover:text-white"
                    >
                      Корзина
                    </Link>
                    <Link
                      href="/reviews"
                      className="w-fit transition-colors hover:text-white"
                    >
                      Отзывы
                    </Link>
                    <Link
                      href="/contacts"
                      className="w-fit transition-colors hover:text-white"
                    >
                      Контакты
                    </Link>
                  </nav>
                </div>
                <div>
                  <div className="font-display text-sm uppercase tracking-wider text-slate-400">
                    Связь
                  </div>
                  <div className="mt-3 space-y-3 text-sm">
                    <a
                      href={`tel:${PHONE_TEL}`}
                      className="block w-fit font-mono text-base font-medium text-white transition-colors hover:text-signal"
                    >
                      {PHONE_DISPLAY}
                    </a>
                    <div className="text-slate-400">
                      г. Жезказган, Казахстан
                    </div>
                    <a
                      href={WA_HREF}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white transition-all hover:bg-emerald-500 active:scale-[0.97]"
                    >
                      Написать в WhatsApp
                    </a>
                  </div>
                </div>
              </div>
              {/* Правый нижний угол оставляем свободным — там плавающая кнопка WhatsApp */}
              <div className="mt-8 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-ink-line pr-16 pt-4 text-xs text-slate-500 sm:pr-24">
                <span>
                  © {new Date().getFullYear()} mirzam.kz — автозапчасти,
                  распродажа остатков
                </span>
                <span className="hidden text-slate-700 sm:inline">·</span>
                <span className="font-mono">
                  Цены актуальны на <TodayDate initial={today} />
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 pr-16 text-[11px] text-slate-600 sm:pr-24">
                <span>Разработка сайта:</span>
                <a
                  href="https://t.me/a_ztt9"
                  target="_blank"
                  rel="noreferrer"
                  className="transition-colors hover:text-white"
                >
                  Telegram @a_ztt9
                </a>
              </div>
            </div>
          </footer>

          <MobileBottomNav />
          <FloatingWhatsApp />
        </CartProvider>
      </body>
    </html>
  );
}
