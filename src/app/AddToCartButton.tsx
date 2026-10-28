"use client";

import { useState } from "react";
import { ShoppingCartOutlined, CheckOutlined } from "@ant-design/icons";
import { useCart } from "./CartProvider";

type Props = {
  slug: string;
  title: string;
  priceKzt: number;
  imageUrl?: string;
  sku?: string;
  size?: "sm" | "md";
};

export default function AddToCartButton({
  slug,
  title,
  priceKzt,
  imageUrl,
  sku,
  size = "sm",
}: Props) {
  const { addItem, items } = useCart();
  const [justAdded, setJustAdded] = useState(false);

  const inCart = items.some((i) => i.slug === slug);

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    addItem({ slug, title, priceKzt, imageUrl, sku });
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1200);
  }

  const base =
    size === "md"
      ? "flex h-11 items-center justify-center gap-2 rounded-lg px-5 text-sm font-bold transition-all active:scale-[0.97]"
      : "flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 text-[13px] font-bold transition-all active:scale-[0.97] sm:h-9 sm:text-xs";

  if (justAdded || inCart) {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`${base} bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-300/70 hover:bg-emerald-100`}
      >
        <span className={justAdded ? "animate-pop" : undefined}>
          <CheckOutlined />
        </span>
        {justAdded ? "Добавлено!" : "В корзине"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`${base} bg-brand text-white shadow-sm hover:bg-brand-deep`}
    >
      <ShoppingCartOutlined /> В корзину
    </button>
  );
}
