"use client";

import { usePathname } from "next/navigation";
import WhatsAppIcon from "./WhatsAppIcon";

export default function FloatingWhatsApp() {
  const pathname = usePathname() ?? "/";

  // На странице товара и в корзине WhatsApp уже есть в липкой панели действий —
  // плавающую кнопку там прячем, чтобы не задваивать и не перекрывать её.
  const hidden =
    pathname.startsWith("/cart") || pathname.startsWith("/products");
  if (hidden) return null;

  const phone = "77015221047";
  const message = "Здравствуйте! Хочу уточнить наличие запчасти.";
  const href = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="group fixed bottom-[4.75rem] right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/40 transition-transform hover:scale-110 active:scale-95 sm:bottom-6 sm:right-6"
      aria-label="Написать в WhatsApp"
    >
      {/* Мягкое «эхо» вокруг кнопки */}
      <span
        aria-hidden
        className="absolute inset-0 -z-10 animate-ping-soft rounded-full bg-emerald-400"
      />
      <WhatsAppIcon className="h-7 w-7" />
    </a>
  );
}
