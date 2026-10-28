"use client";

import { useState } from "react";

type AdminImagePreviewProps = {
  images: string[];
  title: string;
  initialIndex: number;
};

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.25;

export default function AdminImagePreview({
  images,
  title,
  initialIndex,
}: AdminImagePreviewProps) {
  const [index, setIndex] = useState(initialIndex);
  const [isOpen, setIsOpen] = useState(false);
  const [zoom, setZoom] = useState(1);

  const current = images[index] ?? images[0] ?? "/placeholders/part.svg";
  const thumb = images[initialIndex] ?? images[0] ?? "/placeholders/part.svg";

  function open() {
    setIndex(initialIndex);
    setZoom(1);
    setIsOpen(true);
  }

  function goPrev() {
    if (images.length < 2) return;
    setIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    setZoom(1);
  }

  function goNext() {
    if (images.length < 2) return;
    setIndex((prev) => (prev + 1) % images.length);
    setZoom(1);
  }

  function zoomIn() {
    setZoom((prev) => Math.min(MAX_ZOOM, +(prev + ZOOM_STEP).toFixed(2)));
  }

  function zoomOut() {
    setZoom((prev) => Math.max(MIN_ZOOM, +(prev - ZOOM_STEP).toFixed(2)));
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="relative block w-full overflow-hidden rounded-md bg-slate-100"
        aria-label="Открыть фото"
      >
        <img
          src={thumb}
          alt={title}
          className="aspect-square w-full object-cover"
        />
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-50 bg-black/85 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="mx-auto flex h-full w-full max-w-6xl flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm text-white">
                {index + 1} / {images.length}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={zoomOut}
                  className="rounded-md border border-white/30 px-3 py-1.5 text-sm text-white hover:bg-white/10"
                >
                  −
                </button>
                <button
                  type="button"
                  onClick={() => setZoom(1)}
                  className="rounded-md border border-white/30 px-3 py-1.5 text-sm text-white hover:bg-white/10"
                >
                  100%
                </button>
                <button
                  type="button"
                  onClick={zoomIn}
                  className="rounded-md border border-white/30 px-3 py-1.5 text-sm text-white hover:bg-white/10"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-md border border-white/30 px-3 py-1.5 text-sm text-white hover:bg-white/10"
                >
                  Закрыть
                </button>
              </div>
            </div>

            <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-auto rounded-lg bg-black/40">
              {images.length > 1 ? (
                <button
                  type="button"
                  onClick={goPrev}
                  className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 px-3 py-2 text-white hover:bg-black/70"
                  aria-label="Предыдущее фото"
                >
                  ←
                </button>
              ) : null}

              <img
                src={current}
                alt={title}
                className="max-h-full max-w-full object-contain"
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: "center center",
                }}
              />

              {images.length > 1 ? (
                <button
                  type="button"
                  onClick={goNext}
                  className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 px-3 py-2 text-white hover:bg-black/70"
                  aria-label="Следующее фото"
                >
                  →
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
