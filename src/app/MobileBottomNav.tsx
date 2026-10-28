"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AppstoreOutlined,
  ShoppingCartOutlined,
  StarOutlined,
  PhoneOutlined,
} from "@ant-design/icons";
import { useCart } from "./CartProvider";

const navItems = [
  { href: "/", label: "Каталог", icon: AppstoreOutlined, badge: false },
  { href: "/cart", label: "Корзина", icon: ShoppingCartOutlined, badge: true },
  { href: "/reviews", label: "Отзывы", icon: StarOutlined, badge: false },
  { href: "/contacts", label: "Контакты", icon: PhoneOutlined, badge: false },
];

export default function MobileBottomNav() {
  const pathname = usePathname();
  const { totalItems } = useCart();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-steel bg-white/95 shadow-[0_-4px_16px_rgba(18,20,43,0.06)] backdrop-blur sm:hidden">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/" || pathname.startsWith("/products")
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[10px] transition-colors ${
                isActive
                  ? "font-semibold text-brand"
                  : "text-slate-500 active:text-brand"
              }`}
            >
              <span
                className={`relative rounded-full px-4 py-1 transition-all duration-300 ${
                  isActive ? "bg-brand-soft" : "bg-transparent"
                }`}
              >
                <Icon style={{ fontSize: 19 }} />
                {item.badge && totalItems > 0 && (
                  <span
                    key={totalItems}
                    className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 animate-pop items-center justify-center rounded-full bg-signal px-1 font-mono text-[9px] font-bold leading-none text-ink"
                  >
                    {totalItems > 99 ? "99+" : totalItems}
                  </span>
                )}
              </span>
              {item.label}
            </Link>
          );
        })}
      </div>
      {/* Safe area for iOS */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
