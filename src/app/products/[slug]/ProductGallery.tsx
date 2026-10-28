"use client";

import { useMemo, useState } from "react";
import { ExpandOutlined } from "@ant-design/icons";
import Lightbox from "@/app/Lightbox";

type ProductGalleryProps = {
  images: string[];
  title: string;
};

const FALLBACK_SRC = "/placeholders/part.svg";

function handleImgError(e: React.SyntheticEvent<HTMLImageElement>) {
  const el = e.currentTarget;
  if (!el.src.endsWith(FALLBACK_SRC)) el.src = FALLBACK_SRC;
}

export default function ProductGallery({ images, title }: ProductGalleryProps) {
  const gallery = useMemo(() => images.filter(Boolean), [images]);
  const [index, setIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const current = gallery[index] ?? "/placeholders/part.svg";

  return (
    <>
      <div>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="group relative block w-full overflow-hidden rounded-xl border border-steel bg-paper"
          aria-label="Открыть фото на весь экран"
        >
          <img
            key={current}
            src={current}
            alt={title}
            onError={handleImgError}
            className="aspect-[4/3] w-full animate-fade-in object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
          <span className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded-md bg-ink/70 px-2 py-1 text-[11px] font-medium text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
            <ExpandOutlined style={{ fontSize: 11 }} /> Увеличить
          </span>
        </button>

        {gallery.length > 1 ? (
          <div className="mt-2.5 grid grid-cols-4 gap-2">
            {gallery.slice(0, 8).map((src, i) => (
              <button
                type="button"
                key={`${src}-${i}`}
                onClick={() => setIndex(i)}
                className={`relative overflow-hidden rounded-lg border bg-paper transition-all ${
                  i === index
                    ? "border-brand ring-2 ring-brand/30"
                    : "border-steel opacity-70 hover:opacity-100"
                }`}
                aria-label={`Фото ${i + 1}`}
              >
                <img
                  src={src}
                  alt={`${title} ${i + 1}`}
                  loading="lazy"
                  onError={handleImgError}
                  className="aspect-square w-full object-cover"
                />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {isOpen ? (
        <Lightbox
          images={gallery.length ? gallery : [current]}
          title={title}
          index={index}
          onClose={() => setIsOpen(false)}
          onIndexChange={setIndex}
        />
      ) : null}
    </>
  );
}
