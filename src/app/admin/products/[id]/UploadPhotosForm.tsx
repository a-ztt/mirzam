"use client";

import { useRef, useState, useTransition } from "react";

type UploadPhotosFormProps = {
  uploadAction: (formData: FormData) => Promise<void>;
};

const MAX_DIMENSION = 1920;
const QUALITY = 0.82;
const SKIP_COMPRESSION_UNDER_BYTES = 900 * 1024;

export default function UploadPhotosForm({
  uploadAction,
}: UploadPhotosFormProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isPending, startTransition] = useTransition();
  const [statusText, setStatusText] = useState<string>("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const files = Array.from(inputRef.current?.files ?? []);
    if (!files.length) {
      setStatusText("");
      const formData = new FormData();
      startTransition(() => {
        void uploadAction(formData);
      });
      return;
    }

    setStatusText("Подготовка фото…");

    const processed = await Promise.all(files.map((file) => processFile(file)));
    const reducedBytes =
      files.reduce((sum, file) => sum + file.size, 0) -
      processed.reduce((sum, file) => sum + file.size, 0);

    const formData = new FormData();
    for (const file of processed) {
      formData.append("photos", file, file.name);
    }

    setStatusText(
      reducedBytes > 0
        ? `Сжато: ${formatBytes(reducedBytes)}. Загружаем…`
        : "Загружаем…",
    );

    startTransition(() => {
      void uploadAction(formData);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
      <input
        ref={inputRef}
        name="photos"
        type="file"
        multiple
        accept="image/*"
      />
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending ? "Загрузка…" : "Загрузить"}
      </button>
      {statusText ? (
        <div className="text-xs text-slate-600">{statusText}</div>
      ) : null}
    </form>
  );
}

async function processFile(file: File): Promise<File> {
  const type = (file.type || "").toLowerCase();
  const isRaster =
    type === "image/jpeg" ||
    type === "image/jpg" ||
    type === "image/png" ||
    type === "image/webp";

  if (!isRaster) return file;
  if (file.size <= SKIP_COMPRESSION_UNDER_BYTES) return file;

  try {
    const image = await loadImage(file);
    const { width, height } = fitSize(image.width, image.height, MAX_DIMENSION);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) return file;

    context.drawImage(image, 0, 0, width, height);

    const blob = await canvasToBlob(canvas, "image/webp", QUALITY);
    if (!blob) return file;
    if (blob.size >= file.size) return file;

    const nameWithoutExt = file.name.replace(/\.[^.]+$/, "");
    return new File([blob], `${nameWithoutExt}.webp`, {
      type: "image/webp",
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}

function loadImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);

  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image decode failed"));
    };

    image.src = url;
  });
}

function fitSize(width: number, height: number, maxDimension: number) {
  if (width <= maxDimension && height <= maxDimension) {
    return { width, height };
  }

  if (width >= height) {
    const ratio = maxDimension / width;
    return {
      width: Math.max(1, Math.round(width * ratio)),
      height: Math.max(1, Math.round(height * ratio)),
    };
  }

  const ratio = maxDimension / height;
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

function formatBytes(value: number) {
  const abs = Math.max(0, value);
  if (abs < 1024) return `${abs} B`;
  if (abs < 1024 * 1024) return `${(abs / 1024).toFixed(1)} KB`;
  return `${(abs / (1024 * 1024)).toFixed(1)} MB`;
}
