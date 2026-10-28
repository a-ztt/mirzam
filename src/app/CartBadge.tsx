"use client";

import { useCart } from "./CartProvider";
import { ShoppingCartOutlined } from "@ant-design/icons";
import Link from "next/link";

export default function CartBadge() {
  const { totalItems } = useCart();

  return (
    <Link
      href="/cart"
      className="relative ml-1 flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08)_inset] transition-all hover:bg-brand-deep active:scale-[0.97] sm:ml-2"
    >
      <ShoppingCartOutlined style={{ fontSize: 16 }} />
      <span className="hidden sm:inline">Корзина</span>
      {totalItems > 0 && (
        <span
          key={totalItems}
          className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] animate-pop items-center justify-center rounded-full bg-signal px-1 font-mono text-[10px] font-bold leading-none text-ink shadow-sm"
        >
          {totalItems > 99 ? "99+" : totalItems}
        </span>
      )}
    </Link>
  );
}
