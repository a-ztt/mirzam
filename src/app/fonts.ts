import { JetBrains_Mono, Manrope, Tektur } from "next/font/google";

// UI и текст — Manrope: геометрический гротеск с полной кириллицей.
export const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  variable: "--font-sans",
  display: "swap",
});

// Крупные заголовки — Tektur: «станочный» дисплейный шрифт, кириллица.
export const tektur = Tektur({
  subsets: ["latin", "cyrillic"],
  variable: "--font-display",
  display: "swap",
});

// Артикулы, данные «заводской таблички» — моноширинный.
export const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin", "cyrillic"],
  variable: "--font-mono",
  display: "swap",
});
