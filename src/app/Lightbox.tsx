"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  CloseOutlined,
  LeftOutlined,
  RightOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
} from "@ant-design/icons";

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.5;
const FALLBACK_SRC = "/placeholders/part.svg";

function handleImgError(e: React.SyntheticEvent<HTMLImageElement>) {
  const el = e.currentTarget;
  if (!el.src.endsWith(FALLBACK_SRC)) el.src = FALLBACK_SRC;
}

type LightboxProps = {
  images: string[];
  title: string;
  index: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
};

export default function Lightbox({
  images,
  title,
  index,
  onClose,
  onIndexChange,
}: LightboxProps) {
  const [zoom, setZoom] = useState(1);
  const current = images[index] ?? images[0] ?? "/placeholders/part.svg";

  const goPrev = useCallback(() => {
    if (images.length < 2) return;
    onIndexChange(index === 0 ? images.length - 1 : index - 1);
    setZoom(1);
  }, [images.length, index, onIndexChange]);

  const goNext = useCallback(() => {
    if (images.length < 2) return;
    onIndexChange((index + 1) % images.length);
    setZoom(1);
  }, [images.length, index, onIndexChange]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    }
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose, goPrev, goNext]);

  const iconBtn =
    "flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white transition-colors hover:bg-white/10 active:bg-white/20";

  // Портал в body: у предков может остаться transform (например, от
  // animation-fill-mode анимаций появления), который делает их containing
  // block для fixed — без портала просмотрщик «запирается» внутри блока.
  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex animate-fade-in flex-col bg-ink/95 p-3 backdrop-blur-sm sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="mx-auto flex h-full w-full max-w-6xl min-h-0 flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <div className="font-mono text-sm text-white/70">
            {index + 1} / {images.length}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z - ZOOM_STEP))}
              className={iconBtn}
              aria-label="Уменьшить"
            >
              <ZoomOutOutlined style={{ fontSize: 15 }} />
            </button>
            <button
              type="button"
              onClick={() => setZoom(1)}
              className="h-9 rounded-full border border-white/15 px-3 font-mono text-xs text-white transition-colors hover:bg-white/10"
              aria-label="Сбросить масштаб"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z + ZOOM_STEP))}
              className={iconBtn}
              aria-label="Увеличить"
            >
              <ZoomInOutlined style={{ fontSize: 15 }} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className={`${iconBtn} ml-1`}
              aria-label="Закрыть"
            >
              <CloseOutlined style={{ fontSize: 15 }} />
            </button>
          </div>
        </div>

        <div
          className="relative flex min-h-0 flex-1 items-center justify-center overflow-auto rounded-2xl bg-black/30"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          {images.length > 1 ? (
            <button
              type="button"
              onClick={goPrev}
              className="absolute left-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/25"
              aria-label="Предыдущее фото"
            >
              <LeftOutlined style={{ fontSize: 16 }} />
            </button>
          ) : null}

          <img
            key={current}
            src={current}
            alt={title}
            onError={handleImgError}
            className="max-h-full max-w-full animate-zoom-in object-contain"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: "center center",
            }}
          />

          {images.length > 1 ? (
            <button
              type="button"
              onClick={goNext}
              className="absolute right-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/25"
              aria-label="Следующее фото"
            >
              <RightOutlined style={{ fontSize: 16 }} />
            </button>
          ) : null}
        </div>

        {images.length > 1 ? (
          <div className="flex justify-center gap-2 overflow-x-auto pb-1">
            {images.map((src, i) => (
              <button
                type="button"
                key={`${src}-${i}`}
                onClick={() => {
                  onIndexChange(i);
                  setZoom(1);
                }}
                className={`h-12 w-12 shrink-0 overflow-hidden rounded-lg transition-all ${
                  i === index
                    ? "ring-2 ring-signal"
                    : "opacity-50 ring-1 ring-white/20 hover:opacity-90"
                }`}
                aria-label={`Фото ${i + 1}`}
              >
                <img
                  src={src}
                  alt=""
                  onError={handleImgError}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
