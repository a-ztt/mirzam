"use server";

import { prisma } from "./db";
import { revalidatePath } from "next/cache";

export async function submitReview(formData: FormData) {
  const authorName = String(formData.get("authorName") ?? "").trim();
  const text = String(formData.get("text") ?? "").trim();
  const ratingRaw = Number(formData.get("rating") ?? 5);
  const type = String(formData.get("type") ?? "site");
  const productSlug = String(formData.get("productSlug") ?? "").trim() || null;

  // Validation
  if (!authorName || authorName.length > 100) {
    return { error: "Укажите ваше имя (до 100 символов)" };
  }
  if (!text || text.length < 5 || text.length > 2000) {
    return { error: "Отзыв должен быть от 5 до 2000 символов" };
  }
  const rating = Math.max(1, Math.min(5, Math.round(ratingRaw)));
  if (type !== "site" && type !== "product") {
    return { error: "Неверный тип отзыва" };
  }

  await prisma.review.create({
    data: {
      authorName,
      text,
      rating,
      type,
      productSlug,
      isApproved: false, // moderation by admin
    },
  });

  if (type === "product" && productSlug) {
    revalidatePath(`/products/${productSlug}`);
  }
  revalidatePath("/reviews");

  return { success: true };
}

export async function getSiteReviews() {
  return prisma.review.findMany({
    where: { type: "site", isApproved: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function getProductReviews(productSlug: string) {
  return prisma.review.findMany({
    where: { type: "product", productSlug, isApproved: true },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
}

export async function getAllReviewsForAdmin() {
  return prisma.review.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function approveReview(id: string) {
  await prisma.review.update({
    where: { id },
    data: { isApproved: true },
  });
  revalidatePath("/reviews");
}

export async function deleteReview(id: string) {
  await prisma.review.delete({ where: { id } });
  revalidatePath("/reviews");
}
