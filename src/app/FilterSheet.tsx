"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { CloseOutlined, FilterOutlined } from "@ant-design/icons";

type FilterSheetProps = {
  activeCount: number;
  clearHref: string;
  children: React.ReactNode;
};

// Мобильная шторка фильтров: кнопка-триггер со счётчиком активных фильтров +
// выезжающая снизу панель. Форма (children) — обычный GET-form, её кнопка
// «Показать» и делает навигацию, поэтому шторка не хранит значения сама.
export default function FilterSheet({
  activeCount,
  clearHref,
  children,
}: FilterSheetProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-steel bg-white text-sm font-bold text-ink shadow-card transition-colors active:bg-paper"
      >
        <FilterOutlined style={{ fontSize: 15 }} />
        Фильтры
        {activeCount > 0 ? (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 font-mono text-[11px] font-bold text-white">
            {activeCount}
          </span>
        ) : null}
      </button>

      {mounted && open
        ? createPortal(
            <div
              className="fixed inset-0 z-[65] flex flex-col justify-end"
              role="dialog"
              aria-modal="true"
              aria-label="Фильтры"
            >
              <button
                type="button"
                aria-label="Закрыть фильтры"
                onClick={() => setOpen(false)}
                className="absolute inset-0 animate-fade-in bg-ink/60 backdrop-blur-[2px]"
              />
              <div className="relative max-h-[86vh] animate-slide-up overflow-hidden rounded-t-2xl bg-white shadow-plate">
                <div className="hazard h-1" aria-hidden />
                <div className="flex items-center justify-between border-b border-steel px-4 py-3">
                  <div className="flex items-center gap-2 font-display text-sm uppercase tracking-wider text-ink">
                    <FilterOutlined style={{ fontSize: 15 }} /> Фильтры
                  </div>
                  <div className="flex items-center gap-3">
                    {activeCount > 0 ? (
                      <Link
                        href={clearHref}
                        onClick={() => setOpen(false)}
                        className="text-xs font-semibold text-brand transition-colors active:text-brand-deep"
                      >
                        Сбросить
                      </Link>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      aria-label="Закрыть"
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-steel text-slate-500 active:bg-paper"
                    >
                      <CloseOutlined style={{ fontSize: 13 }} />
                    </button>
                  </div>
                </div>
                <div className="max-h-[calc(86vh-3.5rem)] overflow-y-auto overscroll-contain p-4">
                  {children}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
