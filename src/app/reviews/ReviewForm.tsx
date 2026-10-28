"use client";

import { useState } from "react";
import { LoadingOutlined, StarFilled } from "@ant-design/icons";
import { submitReview } from "@/lib/reviews";

type Props = {
  type: "site" | "product";
  productSlug?: string;
};

export default function ReviewForm({ type, productSlug }: Props) {
  const [rating, setRating] = useState(5);
  const [hovered, setHovered] = useState<number | null>(null);
  const [status, setStatus] = useState<
    "idle" | "sending" | "success" | "error"
  >("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg("");

    const formData = new FormData(e.currentTarget);
    formData.set("rating", String(rating));
    formData.set("type", type);
    if (productSlug) formData.set("productSlug", productSlug);

    const result = await submitReview(formData);
    if (result.error) {
      setErrorMsg(result.error);
      setStatus("error");
    } else {
      setStatus("success");
      (e.target as HTMLFormElement).reset();
      setRating(5);
    }
  }

  if (status === "success") {
    return (
      <div className="animate-zoom-in rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
        <div className="text-base font-bold text-emerald-800">
          Спасибо за отзыв!
        </div>
        <p className="mt-1 text-sm text-emerald-700">
          Он появится на сайте после модерации.
        </p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="mt-3 text-sm font-semibold text-emerald-700 transition-colors hover:text-emerald-900"
        >
          Написать ещё один
        </button>
      </div>
    );
  }

  const inputCls =
    "mt-1.5 w-full rounded-lg border border-steel bg-white px-3 py-2 text-sm outline-none transition-colors placeholder:text-slate-400 hover:border-slate-300 focus:border-brand";

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5">
      <div>
        <label className="block text-xs font-semibold text-slate-600">
          Ваше имя
        </label>
        <input
          name="authorName"
          required
          maxLength={100}
          className={inputCls}
          placeholder="Как к вам обращаться"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-600">
          Оценка
        </label>
        <div
          className="mt-1.5 flex gap-1"
          onMouseLeave={() => setHovered(null)}
        >
          {[1, 2, 3, 4, 5].map((star) => {
            const lit = star <= (hovered ?? rating);
            return (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHovered(star)}
                className={`text-2xl transition-all hover:scale-110 active:scale-125 ${
                  lit ? "text-signal" : "text-steel"
                }`}
                aria-label={`Оценка ${star}`}
              >
                <StarFilled />
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-600">
          Отзыв
        </label>
        <textarea
          name="text"
          required
          minLength={5}
          maxLength={2000}
          rows={4}
          className={`${inputCls} resize-none`}
          placeholder="Что покупали, подошла ли деталь, как прошёл заказ…"
        />
      </div>

      {errorMsg && (
        <div className="animate-fade-up rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-brand-deep active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60"
      >
        {status === "sending" ? (
          <>
            <LoadingOutlined spin /> Отправка…
          </>
        ) : (
          "Отправить отзыв"
        )}
      </button>
    </form>
  );
}
