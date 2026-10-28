import { StarFilled } from "@ant-design/icons";
import { getSiteReviews } from "@/lib/reviews";
import ReviewForm from "./ReviewForm";

export const dynamic = "force-dynamic";

export default async function ReviewsPage() {
  const reviews = await getSiteReviews();
  const avg =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  return (
    <main className="space-y-4">
      <div className="animate-fade-up rounded-2xl border border-steel bg-white p-4 shadow-card sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-xl uppercase tracking-wide text-ink sm:text-2xl">
              Отзывы о магазине
            </h1>
            <p className="mt-1.5 text-sm text-slate-500">
              Реальные впечатления покупателей. Мы читаем каждый отзыв.
            </p>
          </div>
          {reviews.length > 0 ? (
            <div className="flex items-center gap-2.5 rounded-xl border border-steel bg-paper px-3.5 py-2">
              <span className="text-2xl font-extrabold tabular-nums text-ink">
                {avg.toFixed(1)}
              </span>
              <div>
                <div className="flex gap-0.5 text-signal">
                  {Array.from({ length: 5 }, (_, i) => (
                    <StarFilled
                      key={i}
                      style={{
                        fontSize: 12,
                        color: i < Math.round(avg) ? undefined : "#e3e5f0",
                      }}
                    />
                  ))}
                </div>
                <div className="mt-0.5 text-[11px] text-slate-400">
                  {reviews.length} отзыв(ов)
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px] lg:items-start">
        <div className="stagger space-y-2.5">
          {reviews.length > 0 ? (
            reviews.map((review) => (
              <article
                key={review.id}
                className="rounded-2xl border border-steel bg-white p-4 shadow-card"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-soft text-sm font-bold text-brand-dark">
                      {review.authorName.trim().charAt(0).toUpperCase() || "?"}
                    </span>
                    <div>
                      <div className="text-sm font-semibold text-ink">
                        {review.authorName}
                      </div>
                      <div className="font-mono text-[10px] text-slate-400">
                        {new Date(review.createdAt).toLocaleDateString(
                          "ru-KZ",
                          {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          },
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-0.5 text-signal">
                    {Array.from({ length: 5 }, (_, i) => (
                      <StarFilled
                        key={i}
                        style={{
                          fontSize: 13,
                          color: i < review.rating ? undefined : "#e3e5f0",
                        }}
                      />
                    ))}
                  </div>
                </div>
                <p className="mt-2.5 whitespace-pre-line text-sm leading-relaxed text-slate-700">
                  {review.text}
                </p>
              </article>
            ))
          ) : (
            <div className="rounded-2xl border border-steel bg-white px-6 py-14 text-center shadow-card">
              <div className="flex justify-center gap-1 text-2xl text-steel">
                {Array.from({ length: 5 }, (_, i) => (
                  <StarFilled key={i} />
                ))}
              </div>
              <div className="mt-3 font-display text-lg uppercase tracking-wide text-ink">
                Пока нет отзывов
              </div>
              <p className="mt-1.5 text-sm text-slate-500">
                Покупали у нас? Будьте первым — это займёт минуту.
              </p>
            </div>
          )}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="animate-fade-up rounded-2xl border border-steel bg-white p-4 shadow-card [animation-delay:100ms] sm:p-5">
            <h2 className="font-display text-sm uppercase tracking-wider text-ink">
              Оставить отзыв
            </h2>
            <div className="mt-3">
              <ReviewForm type="site" />
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
