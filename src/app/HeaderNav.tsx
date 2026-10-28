"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AppstoreOutlined,
  StarOutlined,
  PhoneOutlined,
} from "@ant-design/icons";

const links = [
  {
    href: "/",
    label: "Каталог",
    icon: AppstoreOutlined,
    isActive: (p: string) => p === "/" || p.startsWith("/products"),
    hideOnMobile: false,
  },
  {
    href: "/reviews",
    label: "Отзывы",
    icon: StarOutlined,
    isActive: (p: string) => p.startsWith("/reviews"),
    hideOnMobile: true,
  },
  {
    href: "/contacts",
    label: "Контакты",
    icon: PhoneOutlined,
    isActive: (p: string) => p.startsWith("/contacts"),
    hideOnMobile: false,
  },
];

export default function HeaderNav() {
  const pathname = usePathname() ?? "/";

  return (
    <nav className="flex items-center gap-0.5 sm:gap-1">
      {links.map((link) => {
        const Icon = link.icon;
        const active = link.isActive(pathname);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`${
              link.hideOnMobile ? "hidden sm:flex" : "flex"
            } items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-white/10 text-white"
                : "text-slate-300 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Icon style={{ fontSize: 16 }} />
            <span className="hidden sm:inline">{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
