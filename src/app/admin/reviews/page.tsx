import {
  getAllReviewsForAdmin,
  approveReview,
  deleteReview,
} from "@/lib/reviews";
import { StarFilled } from "@ant-design/icons";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage() {
  const reviews = await getAllReviewsForAdmin();

  async function handleApprove(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    await approveReview(id);
    revalidatePath("/admin/reviews");
  }

  async function handleDelete(formData: FormData) {
    "use server";
    const id = formData.get("id") as string;
    await deleteReview(id);
    revalidatePath("/admin/reviews");
  }

  return (
    <main className="space-y-4">
      <h1 className="text-xl font-semibold">Управление отзывами</h1>
      <p className="text-sm text-slate-600">
        Отзывы от пользователей. Одобряйте или удаляйте отзывы.
      </p>

      {reviews.length === 0 ? (
        <div className="rounded-xl border bg-white p-6 text-center text-slate-500">
          Нет отзывов
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <div
              key={review.id}
              className={`rounded-xl border p-4 ${
                review.isApproved
                  ? "border-emerald-200 bg-emerald-50/50"
                  : "border-amber-200 bg-amber-50/50"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{review.authorName}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] ${
                        review.isApproved
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {review.isApproved ? "Одобрен" : "На модерации"}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                      {review.type === "product"
                        ? `Товар: ${review.productSlug}`
                        : "Сайт"}
                    </span>
                  </div>
                  <div className="mt-1 flex gap-0.5 text-amber-400">
                    {Array.from({ length: 5 }, (_, i) => (
                      <StarFilled
                        key={i}
                        style={{
                          fontSize: 12,
                          color: i < review.rating ? undefined : "#e2e8f0",
                        }}
                      />
                    ))}
                  </div>
                </div>
                <div className="text-xs text-slate-400">
                  {new Date(review.createdAt).toLocaleDateString("ru-KZ")}
                </div>
              </div>
              <p className="mt-2 text-sm text-slate-700 whitespace-pre-line">
                {review.text}
              </p>
              <div className="mt-3 flex gap-2">
                {!review.isApproved && (
                  <form action={handleApprove}>
                    <input type="hidden" name="id" value={review.id} />
                    <button
                      type="submit"
                      className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                    >
                      Одобрить
                    </button>
                  </form>
                )}
                <form action={handleDelete}>
                  <input type="hidden" name="id" value={review.id} />
                  <button
                    type="submit"
                    className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                  >
                    Удалить
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
