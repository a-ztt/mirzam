import { StarFilled } from "@ant-design/icons";
import { getProductReviews } from "@/lib/reviews";
import ReviewForm from "@/app/reviews/ReviewForm";

export default async function ProductReviews({
  productSlug,
}: {
  productSlug: string;
}) {
  const reviews = await getProductReviews(productSlug);

  return (
    <section className="animate-fade-up rounded-2xl border border-steel bg-white p-4 shadow-card [animation-delay:150ms] sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-sm uppercase tracking-wider text-ink">
          Отзывы о товаре
        </h2>
        {reviews.length > 0 ? (
          <span className="text-xs text-slate-400">
            {reviews.length} отзыв(ов)
          </span>
        ) : null}
      </div>

      {reviews.length > 0 ? (
        <div className="mt-3 space-y-2.5">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="rounded-xl border border-steel/70 bg-paper/60 p-3.5"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-soft text-sm font-bold text-brand-dark">
                    {review.authorName.trim().charAt(0).toUpperCase() || "?"}
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-ink">
                      {review.authorName}
                    </div>
                    <div className="font-mono text-[10px] text-slate-400">
                      {new Date(review.createdAt).toLocaleDateString("ru-KZ", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </div>
                  </div>
                </div>
                <div className="flex gap-0.5 text-signal">
                  {Array.from({ length: 5 }, (_, i) => (
                    <StarFilled
                      key={i}
                      style={{
                        fontSize: 12,
                        color: i < review.rating ? undefined : "#e3e5f0",
                      }}
                    />
                  ))}
                </div>
              </div>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-700">
                {review.text}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-500">
          Об этой детали пока никто не писал. Купили её? Расскажите, подошла
          ли.
        </p>
      )}

      <details className="group mt-4">
        <summary className="inline-flex cursor-pointer list-none items-center gap-2 rounded-lg border border-brand-border px-4 py-2 text-sm font-semibold text-brand transition-colors hover:bg-brand-soft [&::-webkit-details-marker]:hidden">
          Написать отзыв о товаре
        </summary>
        <div className="mt-3 max-w-lg animate-fade-up">
          <ReviewForm type="product" productSlug={productSlug} />
        </div>
      </details>
    </section>
  );
}
