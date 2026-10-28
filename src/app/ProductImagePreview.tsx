"use client";

import { useEffect, useRef, useState } from "react";

type ProductImagePreviewProps = {
  images: string[];
  title: string;
  initialIndex?: number;
};

const FALLBACK_SRC = "/placeholders/part.svg";

// Превью фото в каталоге: плавное появление после загрузки + фолбэк на
// плейсхолдер. Навигацию делает обёртка-ссылка, просмотрщик — только на
// странице товара.
export default function ProductImagePreview({
  images,
  title,
  initialIndex = 0,
}: ProductImagePreviewProps) {
  const [ready, setReady] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const src = images[initialIndex] ?? images[0] ?? FALLBACK_SRC;

  // Кэшированные изображения могут не вызвать onLoad после гидрации,
  // а при листании стрелками src меняется — сверяем состояние заново.
  useEffect(() => {
    const el = imgRef.current;
    if (el?.complete && el.naturalWidth > 0) setReady(true);
    else setReady(false);
  }, [src]);

  return (
    <img
      ref={imgRef}
      src={src}
      alt={title}
      loading="lazy"
      onLoad={() => setReady(true)}
      onError={(e) => {
        const el = e.currentTarget;
        if (!el.src.endsWith(FALLBACK_SRC)) el.src = FALLBACK_SRC;
      }}
      className={`h-full w-full object-cover transition-[transform,opacity] duration-500 ${
        ready ? "opacity-100" : "opacity-0"
      }`}
    />
  );
}
