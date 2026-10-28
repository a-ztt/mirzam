import fs from "node:fs/promises";

import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AdminImagePreview from "./AdminImagePreview";
import UploadPhotosForm from "./UploadPhotosForm";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { invalidateMockProductsCache } from "@/lib/mockProducts";
import {
  isSupportedImageMime,
  publicUploadUrl,
  safeJoinUploadPath,
  saveUploadedFile,
} from "@/lib/uploads";

export const runtime = "nodejs";

async function loadDirectoryNames(table: "Category" | "Brand" | "Unit") {
  try {
    if (table === "Category") {
      return await prisma.$queryRaw<Array<{ name: string }>>`
        SELECT "name"
        FROM "Category"
        WHERE "isActive" = true
        ORDER BY "name" ASC
      `;
    }
    if (table === "Brand") {
      return await prisma.$queryRaw<Array<{ name: string }>>`
        SELECT "name"
        FROM "Brand"
        WHERE "isActive" = true
        ORDER BY "name" ASC
      `;
    }
    return await prisma.$queryRaw<Array<{ name: string }>>`
      SELECT "name"
      FROM "Unit"
      WHERE "isActive" = true
      ORDER BY "name" ASC
    `;
  } catch {
    return [];
  }
}

function isNextRedirectError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

export default async function AdminProductEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  const { id } = await params;

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      images: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
    },
  });

  const [
    categoryRows,
    brandRows,
    unitRows,
    productCategoryRows,
    productBrandRows,
    productUnitRows,
  ] = await Promise.all([
    loadDirectoryNames("Category"),
    loadDirectoryNames("Brand"),
    loadDirectoryNames("Unit"),
    prisma.product.findMany({
      distinct: ["category"],
      select: { category: true },
    }),
    prisma.product.findMany({ distinct: ["brand"], select: { brand: true } }),
    prisma.product.findMany({ distinct: ["unit"], select: { unit: true } }),
  ]);

  if (!product) {
    return (
      <main className="space-y-3">
        <h1 className="text-xl font-semibold">Товар не найден</h1>
        <Link
          href="/admin/products"
          className="text-sm text-slate-700 hover:underline"
        >
          ← К списку
        </Link>
      </main>
    );
  }

  const productSlug = product.slug;
  const imageUrls = product.images.map((img) => publicUploadUrl(img.path));
  const coverImageId = product.images[0]?.id ?? null;
  const categoryOptions = buildDirectoryOptions([
    ...categoryRows.map((x) => x.name),
    ...productCategoryRows.map((x) => x.category ?? ""),
  ]);
  const brandOptions = buildDirectoryOptions([
    ...brandRows.map((x) => x.name),
    ...productBrandRows.map((x) => x.brand ?? ""),
  ]);
  const unitOptions = buildDirectoryOptions([
    ...unitRows.map((x) => x.name),
    ...productUnitRows.map((x) => x.unit ?? ""),
  ]);
  const store = await cookies();
  const uploadError = store.get("ap_upload_error")?.value;
  const uploadOk = store.get("ap_upload_ok")?.value;
  const categoryError = store.get("ap_category_error")?.value;
  const categoryOk = store.get("ap_category_ok")?.value;
  const brandError = store.get("ap_brand_error")?.value;
  const brandOk = store.get("ap_brand_ok")?.value;
  const unitError = store.get("ap_unit_error")?.value;
  const unitOk = store.get("ap_unit_ok")?.value;

  async function saveAction(formData: FormData) {
    "use server";
    if (!(await getSession())) redirect("/admin/login");

    const title = String(formData.get("title") ?? "").trim();
    const sku = String(formData.get("sku") ?? "").trim() || null;
    const category = String(formData.get("category") ?? "").trim() || null;
    const brand = String(formData.get("brand") ?? "").trim() || null;
    const unit = String(formData.get("unit") ?? "").trim() || null;
    const condition = String(formData.get("condition") ?? "new");
    const qty = parseOptionalInt(formData.get("qty"));
    const priceKzt = parseOptionalInt(formData.get("priceKzt"));
    const description =
      String(formData.get("description") ?? "").trim() || null;
    const isActive = String(formData.get("isActive") ?? "") === "on";

    if (!title) return;

    await prisma.product.update({
      where: { id },
      data: {
        title,
        sku,
        category,
        brand,
        unit,
        condition: condition === "used" ? "used" : "new",
        qty,
        priceKzt,
        description,
        isActive,
      },
    });

    invalidateMockProductsCache();

    redirect(`/admin/products/${id}`);
  }

  async function addCategoryAction(formData: FormData) {
    "use server";
    if (!(await getSession())) redirect("/admin/login");

    const store = await cookies();
    store.set("ap_category_error", "", { path: "/", maxAge: 0 });
    store.set("ap_category_ok", "", { path: "/", maxAge: 0 });

    const name = normalizeDirectoryName(
      String(formData.get("newCategoryName") ?? ""),
    );
    const description =
      String(formData.get("newCategoryDescription") ?? "").trim() || null;

    if (!name) {
      store.set("ap_category_error", "Введите название категории.", {
        path: "/",
        maxAge: 20,
      });
      redirect(`/admin/products/${id}`);
    }

    try {
      const categoryExisting = await prisma.$queryRaw<Array<{ name: string }>>`
        SELECT "name"
        FROM "Category"
      `;
      const categoryAlreadyExists = categoryExisting.some(
        (x) => normalizeDirectoryKey(x.name) === normalizeDirectoryKey(name),
      );

      if (categoryAlreadyExists) {
        store.set("ap_category_ok", `Категория уже есть: ${name}`, {
          path: "/",
          maxAge: 20,
        });
        redirect(`/admin/products/${id}`);
      }

      await prisma.$executeRaw`
        INSERT INTO "Category" ("id", "name", "description", "isActive", "createdAt", "updatedAt")
        VALUES (lower(hex(randomblob(16))), ${name}, ${description}, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT DO UPDATE SET
          "description" = excluded."description",
          "isActive" = true,
          "updatedAt" = CURRENT_TIMESTAMP
      `;

      store.set("ap_category_ok", `Категория добавлена: ${name}`, {
        path: "/",
        maxAge: 20,
      });

      redirect(`/admin/products/${id}`);
    } catch (e) {
      if (isNextRedirectError(e)) throw e;
      store.set("ap_category_error", "Не удалось добавить категорию.", {
        path: "/",
        maxAge: 20,
      });
      redirect(`/admin/products/${id}`);
    }
  }

  async function addBrandAction(formData: FormData) {
    "use server";
    if (!(await getSession())) redirect("/admin/login");

    const store = await cookies();
    store.set("ap_brand_error", "", { path: "/", maxAge: 0 });
    store.set("ap_brand_ok", "", { path: "/", maxAge: 0 });

    const name = normalizeDirectoryName(
      String(formData.get("newBrandName") ?? ""),
    );
    const description =
      String(formData.get("newBrandDescription") ?? "").trim() || null;

    if (!name) {
      store.set("ap_brand_error", "Введите название бренда.", {
        path: "/",
        maxAge: 20,
      });
      redirect(`/admin/products/${id}`);
    }

    try {
      const brandExisting = await prisma.$queryRaw<Array<{ name: string }>>`
        SELECT "name"
        FROM "Brand"
      `;
      const brandAlreadyExists = brandExisting.some(
        (x) => normalizeDirectoryKey(x.name) === normalizeDirectoryKey(name),
      );

      if (brandAlreadyExists) {
        store.set("ap_brand_ok", `Бренд уже есть: ${name}`, {
          path: "/",
          maxAge: 20,
        });
        redirect(`/admin/products/${id}`);
      }

      await prisma.$executeRaw`
        INSERT INTO "Brand" ("id", "name", "description", "isActive", "createdAt", "updatedAt")
        VALUES (lower(hex(randomblob(16))), ${name}, ${description}, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT DO UPDATE SET
          "description" = excluded."description",
          "isActive" = true,
          "updatedAt" = CURRENT_TIMESTAMP
      `;

      store.set("ap_brand_ok", `Бренд добавлен: ${name}`, {
        path: "/",
        maxAge: 20,
      });

      redirect(`/admin/products/${id}`);
    } catch (e) {
      if (isNextRedirectError(e)) throw e;
      store.set("ap_brand_error", "Не удалось добавить бренд.", {
        path: "/",
        maxAge: 20,
      });
      redirect(`/admin/products/${id}`);
    }
  }

  async function addUnitAction(formData: FormData) {
    "use server";
    if (!(await getSession())) redirect("/admin/login");

    const store = await cookies();
    store.set("ap_unit_error", "", { path: "/", maxAge: 0 });
    store.set("ap_unit_ok", "", { path: "/", maxAge: 0 });

    const name = normalizeDirectoryName(
      String(formData.get("newUnitName") ?? ""),
    );
    const description =
      String(formData.get("newUnitDescription") ?? "").trim() || null;

    if (!name) {
      store.set("ap_unit_error", "Введите название единицы измерения.", {
        path: "/",
        maxAge: 20,
      });
      redirect(`/admin/products/${id}`);
    }

    try {
      const unitExisting = await prisma.$queryRaw<Array<{ name: string }>>`
        SELECT "name"
        FROM "Unit"
      `;
      const unitAlreadyExists = unitExisting.some(
        (x) => normalizeDirectoryKey(x.name) === normalizeDirectoryKey(name),
      );

      if (unitAlreadyExists) {
        store.set("ap_unit_ok", `Ед. изм. уже есть: ${name}`, {
          path: "/",
          maxAge: 20,
        });
        redirect(`/admin/products/${id}`);
      }

      await prisma.$executeRaw`
        INSERT INTO "Unit" ("id", "name", "description", "isActive", "createdAt", "updatedAt")
        VALUES (lower(hex(randomblob(16))), ${name}, ${description}, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT DO UPDATE SET
          "description" = excluded."description",
          "isActive" = true,
          "updatedAt" = CURRENT_TIMESTAMP
      `;

      store.set("ap_unit_ok", `Ед. изм. добавлена: ${name}`, {
        path: "/",
        maxAge: 20,
      });

      redirect(`/admin/products/${id}`);
    } catch (e) {
      if (isNextRedirectError(e)) throw e;
      store.set("ap_unit_error", "Не удалось добавить единицу измерения.", {
        path: "/",
        maxAge: 20,
      });
      redirect(`/admin/products/${id}`);
    }
  }

  async function uploadPhotosAction(formData: FormData) {
    "use server";
    if (!(await getSession())) redirect("/admin/login");

    try {
      const store = await cookies();
      store.set("ap_upload_error", "", { path: "/", maxAge: 0 });
      store.set("ap_upload_ok", "", { path: "/", maxAge: 0 });

      const files = formData.getAll("photos");
      let uploaded = 0;

      for (const f of files) {
        if (!(f instanceof File)) continue;
        if (!f.size) continue;
        if (!isSupportedImageMime(f.type)) {
          store.set(
            "ap_upload_error",
            "Неподдерживаемый формат фото. Используйте JPG, PNG, WEBP, GIF или SVG.",
            {
              path: "/",
              maxAge: 20,
            },
          );
          redirect(`/admin/products/${id}`);
        }

        if (f.size > 12 * 1024 * 1024) {
          store.set(
            "ap_upload_error",
            "Файл слишком большой (макс 12MB). Сожмите фото и попробуйте снова.",
            {
              path: "/",
              maxAge: 20,
            },
          );
          redirect(`/admin/products/${id}`);
        }

        const saved = await saveUploadedFile({ file: f, productSlug });
        await prisma.productImage.create({
          data: {
            productId: id,
            path: saved.relativePath,
            sortOrder: 0,
          },
        });
        uploaded++;
      }

      if (!uploaded) {
        store.set(
          "ap_upload_error",
          "Файл не выбран или формат не поддерживается.",
          {
            path: "/",
            maxAge: 20,
          },
        );
        redirect(`/admin/products/${id}`);
      }

      store.set("ap_upload_ok", `Загружено фото: ${uploaded}`, {
        path: "/",
        maxAge: 20,
      });

      invalidateMockProductsCache();

      redirect(`/admin/products/${id}`);
    } catch (e) {
      if (isNextRedirectError(e)) throw e;
      console.error("uploadPhotosAction failed", e);
      const store = await cookies();
      store.set("ap_upload_ok", "", { path: "/", maxAge: 0 });
      store.set(
        "ap_upload_error",
        "Не удалось загрузить фото. Частая причина: фото слишком большое. Попробуйте уменьшить размер или загрузить по одному.",
        { path: "/", maxAge: 30 },
      );
      redirect(`/admin/products/${id}`);
    }
  }

  async function deletePhotoAction(formData: FormData) {
    "use server";
    if (!(await getSession())) redirect("/admin/login");

    const imageId = String(formData.get("imageId") ?? "");
    if (!imageId) return;

    const img = await prisma.productImage.findUnique({
      where: { id: imageId },
    });
    if (!img || img.productId !== id) return;

    await prisma.productImage.delete({ where: { id: imageId } });

    try {
      const filePath = safeJoinUploadPath(img.path);
      await fs.unlink(filePath);
    } catch {
      // ignore
    }

    invalidateMockProductsCache();

    redirect(`/admin/products/${id}`);
  }

  async function setCoverPhotoAction(formData: FormData) {
    "use server";
    if (!(await getSession())) redirect("/admin/login");

    const imageId = String(formData.get("imageId") ?? "").trim();
    if (!imageId) return;

    const img = await prisma.productImage.findUnique({
      where: { id: imageId },
      select: { id: true, productId: true },
    });

    if (!img || img.productId !== id) return;

    const allImages = await prisma.productImage.findMany({
      where: { productId: id },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true },
    });

    if (!allImages.length) return;
    if (allImages[0]?.id === imageId) {
      redirect(`/admin/products/${id}`);
    }

    const orderedIds = [
      imageId,
      ...allImages.filter((x) => x.id !== imageId).map((x) => x.id),
    ];

    await prisma.$transaction(
      orderedIds.map((idValue, index) =>
        prisma.productImage.update({
          where: { id: idValue },
          data: { sortOrder: index },
        }),
      ),
    );

    invalidateMockProductsCache();

    redirect(`/admin/products/${id}`);
  }

  return (
    <main className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Редактирование товара</h1>
          <div className="text-xs text-slate-600">slug: {product.slug}</div>
        </div>
        <Link
          href="/admin/products"
          className="text-sm text-slate-700 hover:underline"
        >
          ← К списку
        </Link>
      </div>

      <form
        action={saveAction}
        className="grid gap-3 rounded-xl border bg-white p-4"
      >
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <label className="text-xs font-medium text-slate-700">
              Название
            </label>
            <input
              name="title"
              defaultValue={product.title}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-700">
              Артикул (SKU)
            </label>
            <input
              name="sku"
              defaultValue={product.sku ?? ""}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <div>
            <label className="text-xs font-medium text-slate-700">
              Цена, ₸
            </label>
            <input
              name="priceKzt"
              inputMode="numeric"
              defaultValue={product.priceKzt ?? ""}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-700">
              Остаток
            </label>
            <input
              name="qty"
              inputMode="numeric"
              defaultValue={product.qty ?? ""}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-700">
              Состояние
            </label>
            <select
              name="condition"
              defaultValue={product.condition === "used" ? "used" : "new"}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            >
              <option value="new">Новая</option>
              <option value="used">Б/У</option>
            </select>
          </div>
          <div className="flex items-end">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                name="isActive"
                type="checkbox"
                defaultChecked={product.isActive}
              />
              Активен
            </label>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-slate-700">
              Категория
            </label>
            <select
              name="category"
              defaultValue={product.category ?? ""}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            >
              <option value="">Без категории</option>
              {categoryOptions.map((categoryName) => (
                <option key={categoryName} value={categoryName}>
                  {categoryName}
                </option>
              ))}
            </select>

            <div className="mt-2 space-y-2 rounded-md border border-slate-200 bg-slate-50 p-2">
              <div className="text-xs font-medium text-slate-700">
                + Добавить категорию
              </div>
              {categoryError ? (
                <div className="rounded border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-700">
                  {categoryError}
                </div>
              ) : null}
              {categoryOk ? (
                <div className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs text-emerald-700">
                  {categoryOk}
                </div>
              ) : null}
              <input
                name="newCategoryName"
                placeholder="Название новой категории"
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
              <input
                name="newCategoryDescription"
                placeholder="Описание (необязательно)"
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
              <button
                type="submit"
                formAction={addCategoryAction}
                className="rounded-md border px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                Добавить категорию
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-700">Бренд</label>
            <select
              name="brand"
              defaultValue={product.brand ?? ""}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            >
              <option value="">Без бренда</option>
              {brandOptions.map((brandName) => (
                <option key={brandName} value={brandName}>
                  {brandName}
                </option>
              ))}
            </select>

            <div className="mt-2 space-y-2 rounded-md border border-slate-200 bg-slate-50 p-2">
              <div className="text-xs font-medium text-slate-700">
                + Добавить бренд
              </div>
              {brandError ? (
                <div className="rounded border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-700">
                  {brandError}
                </div>
              ) : null}
              {brandOk ? (
                <div className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs text-emerald-700">
                  {brandOk}
                </div>
              ) : null}
              <input
                name="newBrandName"
                placeholder="Название бренда"
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
              <input
                name="newBrandDescription"
                placeholder="Описание (необязательно)"
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
              <button
                type="submit"
                formAction={addBrandAction}
                className="rounded-md border px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                Добавить бренд
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700">
              Ед. изм.
            </label>
            <select
              name="unit"
              defaultValue={product.unit ?? ""}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            >
              <option value="">Не задано</option>
              {unitOptions.map((unitName) => (
                <option key={unitName} value={unitName}>
                  {unitName}
                </option>
              ))}
            </select>

            <div className="mt-2 space-y-2 rounded-md border border-slate-200 bg-slate-50 p-2">
              <div className="text-xs font-medium text-slate-700">
                + Добавить ед. изм.
              </div>
              {unitError ? (
                <div className="rounded border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-700">
                  {unitError}
                </div>
              ) : null}
              {unitOk ? (
                <div className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs text-emerald-700">
                  {unitOk}
                </div>
              ) : null}
              <input
                name="newUnitName"
                placeholder="Название ед. изм."
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
              <input
                name="newUnitDescription"
                placeholder="Описание (необязательно)"
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
              <button
                type="submit"
                formAction={addUnitAction}
                className="rounded-md border px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                Добавить ед. изм.
              </button>
            </div>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-slate-700">Описание</label>
          <textarea
            name="description"
            defaultValue={product.description ?? ""}
            rows={4}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>

        <button className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
          Сохранить
        </button>
      </form>

      <section className="space-y-3 rounded-xl border bg-white p-4">
        <div className="text-sm font-semibold">Фотографии</div>

        {uploadError ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            {uploadError}
          </div>
        ) : null}

        {uploadOk ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            {uploadOk}
          </div>
        ) : null}

        <UploadPhotosForm uploadAction={uploadPhotosAction} />

        {product.images.length ? (
          <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
            {product.images.map((img: { id: string; path: string }, i) => (
              <div key={img.id} className="rounded-lg border p-1.5">
                <AdminImagePreview
                  images={imageUrls}
                  initialIndex={i}
                  title={product.title}
                />
                <div className="mt-2 space-y-2">
                  {img.id === coverImageId ? (
                    <div className="rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 text-center text-[11px] font-medium text-indigo-700">
                      Титульная фото
                    </div>
                  ) : null}

                  <form action={setCoverPhotoAction}>
                    <input type="hidden" name="imageId" value={img.id} />
                    <button
                      disabled={img.id === coverImageId}
                      className="w-full rounded-md border px-3 py-1.5 text-xs hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
                    >
                      Сделать титульной
                    </button>
                  </form>
                </div>
                <form action={deletePhotoAction} className="mt-2">
                  <input type="hidden" name="imageId" value={img.id} />
                  <button className="w-full rounded-md border px-3 py-1.5 text-xs hover:bg-rose-50 hover:text-rose-700">
                    Удалить
                  </button>
                </form>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-slate-600">Пока нет фото.</div>
        )}
      </section>
    </main>
  );
}

function parseOptionalInt(v: FormDataEntryValue | null): number | null {
  if (typeof v !== "string") return null;
  const cleaned = v.replace(/\s+/g, "").replace(",", ".");
  if (!cleaned) return null;
  const n = Number.parseFloat(cleaned);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function normalizeDirectoryName(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeDirectoryKey(value: string) {
  return normalizeDirectoryName(value).toLocaleLowerCase("ru-RU");
}

function buildDirectoryOptions(values: string[]) {
  const byKey = new Map<string, string>();

  for (const raw of values) {
    const normalizedName = normalizeDirectoryName(raw);
    if (!isValidDirectoryName(normalizedName)) continue;
    const key = normalizeDirectoryKey(normalizedName);
    if (!byKey.has(key)) byKey.set(key, normalizedName);
  }

  return Array.from(byKey.values()).sort((a, b) => a.localeCompare(b, "ru"));
}

function isValidDirectoryName(value: string) {
  return Boolean(value) && !value.includes("?") && !value.includes("�");
}
