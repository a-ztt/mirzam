import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppstoreOutlined, EditOutlined } from "@ant-design/icons";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { invalidateMockProductsCache } from "@/lib/mockProducts";

export const runtime = "nodejs";

const UNSORTED = "Несортированные";

function isNextRedirectError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

function normalizeName(s: string) {
  return s.trim().replace(/\s+/g, " ");
}

type SearchParams = {
  confirm?: string;
  edit?: string;
  ok?: string;
};

type PageProps = {
  searchParams?: Promise<SearchParams>;
};

export default async function CategoriesPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  const sp = (await searchParams) ?? {};
  const confirmId = sp.confirm ?? "";
  const editId = sp.edit ?? "";

  // --------------- SERVER ACTIONS ---------------

  async function createAction(formData: FormData) {
    "use server";
    if (!(await getSession())) redirect("/admin/login");

    const name = normalizeName(String(formData.get("name") ?? ""));
    if (!name) redirect("/admin/dictionaries/categories?ok=empty");

    const existing = await prisma.category.findFirst({
      where: { name },
    });
    if (!existing) {
      // case-insensitive check across all
      const all = await prisma.category.findMany({
        select: { id: true, name: true, isActive: true },
      });
      const dup = all.find(
        (c) => c.name.trim().toLowerCase() === name.toLowerCase(),
      );
      if (dup) {
        if (!dup.isActive) {
          await prisma.category.update({
            where: { id: dup.id },
            data: { isActive: true },
          });
          redirect("/admin/dictionaries/categories?ok=restored");
        }
        redirect("/admin/dictionaries/categories?ok=exists");
      }
    }

    if (existing) {
      if (!existing.isActive) {
        await prisma.category.update({
          where: { id: existing.id },
          data: { isActive: true },
        });
        redirect("/admin/dictionaries/categories?ok=restored");
      }
      redirect("/admin/dictionaries/categories?ok=exists");
    }

    await prisma.category.create({
      data: { name, isActive: true },
    });

    redirect("/admin/dictionaries/categories?ok=created");
  }

  async function saveEditAction(formData: FormData) {
    "use server";
    if (!(await getSession())) redirect("/admin/login");

    const id = String(formData.get("id") ?? "").trim();
    const newName = normalizeName(String(formData.get("name") ?? ""));
    const description =
      String(formData.get("description") ?? "").trim() || null;

    if (!id || !newName) redirect("/admin/dictionaries/categories");

    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) redirect("/admin/dictionaries/categories");

    const oldName = category!.name;

    if (oldName !== newName) {
      const all = await prisma.category.findMany({
        select: { id: true, name: true },
      });
      const conflict = all.find(
        (c) =>
          c.id !== id && c.name.trim().toLowerCase() === newName.toLowerCase(),
      );
      if (conflict) redirect("/admin/dictionaries/categories?ok=exists");

      // Rename all products that use the old name
      await prisma.product.updateMany({
        where: { category: oldName },
        data: { category: newName },
      });
    }

    await prisma.category.update({
      where: { id },
      data: { name: newName, description },
    });

    invalidateMockProductsCache();
    redirect("/admin/dictionaries/categories?ok=saved");
  }

  async function deleteAction(formData: FormData) {
    "use server";
    if (!(await getSession())) redirect("/admin/login");

    const id = String(formData.get("id") ?? "").trim();
    const reassign = String(formData.get("reassign") ?? "") === "1";

    if (!id) redirect("/admin/dictionaries/categories");

    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) redirect("/admin/dictionaries/categories");

    if (reassign) {
      // Ensure "Несортированные" exists (upsert не работает в SQLite по не-id полю)
      const unsorted = await prisma.category.findFirst({
        where: { name: UNSORTED },
      });
      if (unsorted) {
        if (!unsorted.isActive) {
          await prisma.category.update({
            where: { id: unsorted.id },
            data: { isActive: true },
          });
        }
      } else {
        await prisma.category.create({
          data: { name: UNSORTED, isActive: true },
        });
      }

      // Move products
      await prisma.product.updateMany({
        where: { category: category!.name },
        data: { category: UNSORTED },
      });
    } else {
      // Clear category on products
      await prisma.product.updateMany({
        where: { category: category!.name },
        data: { category: null },
      });
    }

    await prisma.category.delete({ where: { id } });

    invalidateMockProductsCache();
    redirect("/admin/dictionaries/categories?ok=deleted");
  }

  async function toggleActiveAction(formData: FormData) {
    "use server";
    if (!(await getSession())) redirect("/admin/login");

    const id = String(formData.get("id") ?? "").trim();
    const current = String(formData.get("isActive") ?? "") === "true";

    if (!id) redirect("/admin/dictionaries/categories");

    await prisma.category.update({
      where: { id },
      data: { isActive: !current },
    });

    redirect("/admin/dictionaries/categories?ok=toggled");
  }

  // --------------- DATA ---------------

  const allCategories = await prisma.category.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  const productCountsRaw = await prisma.product.groupBy({
    by: ["category"],
    _count: { id: true },
  });

  const productCountMap = new Map<string, number>();
  for (const row of productCountsRaw) {
    if (row.category) productCountMap.set(row.category, row._count.id);
  }

  const confirmCategory = confirmId
    ? (allCategories.find((c) => c.id === confirmId) ?? null)
    : null;

  const editCategory = editId
    ? (allCategories.find((c) => c.id === editId) ?? null)
    : null;

  const confirmProductCount = confirmCategory
    ? (productCountMap.get(confirmCategory.name) ?? 0)
    : 0;

  const okMessages: Record<string, string> = {
    created: "Категория добавлена.",
    restored: "Категория восстановлена.",
    exists: "Категория с таким названием уже существует.",
    saved: "Изменения сохранены.",
    deleted: "Категория удалена.",
    toggled: "Статус изменён.",
    empty: "Введите название.",
  };
  const flashMessage = sp.ok ? (okMessages[sp.ok] ?? "") : "";

  // --------------- RENDER ---------------

  return (
    <main className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link
            href="/admin/dictionaries"
            className="text-sm text-slate-500 hover:underline"
          >
            ← Справочники
          </Link>
          <span className="text-slate-300">/</span>
          <h1 className="text-xl font-semibold flex items-center gap-1.5">
            <AppstoreOutlined /> Категории
          </h1>
        </div>
      </div>

      {flashMessage && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          {flashMessage}
        </div>
      )}

      {/* Delete confirmation */}
      {confirmCategory && (
        <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4 space-y-3">
          <div className="font-semibold text-red-800">
            Удалить категорию «{confirmCategory.name}»?
          </div>
          {confirmProductCount > 0 ? (
            <div className="text-sm text-red-700">
              В этой категории <strong>{confirmProductCount}</strong>{" "}
              {noun(confirmProductCount, "товар", "товара", "товаров")}.
              Выберите что сделать с ними:
            </div>
          ) : (
            <div className="text-sm text-slate-700">
              В этой категории нет товаров. Можно удалить безопасно.
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {confirmProductCount > 0 && (
              <form action={deleteAction}>
                <input type="hidden" name="id" value={confirmCategory.id} />
                <input type="hidden" name="reassign" value="1" />
                <button
                  type="submit"
                  className="rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600"
                >
                  Перевести в «{UNSORTED}» и удалить
                </button>
              </form>
            )}
            <form action={deleteAction}>
              <input type="hidden" name="id" value={confirmCategory.id} />
              <input type="hidden" name="reassign" value="0" />
              <button
                type="submit"
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                {confirmProductCount > 0
                  ? "Удалить (товары останутся без категории)"
                  : "Удалить"}
              </button>
            </form>
            <Link
              href="/admin/dictionaries/categories"
              className="rounded-md border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Отмена
            </Link>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        {/* Category list */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b bg-slate-50 px-4 py-2 text-xs font-medium text-slate-500 uppercase tracking-wide">
            Список категорий ({allCategories.length})
          </div>
          {allCategories.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-slate-500">
              Категорий пока нет
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {allCategories.map((cat) => {
                const count = productCountMap.get(cat.name) ?? 0;
                const isEditing = editCategory?.id === cat.id;
                return (
                  <li
                    key={cat.id}
                    className={`px-4 py-3 ${!cat.isActive ? "opacity-50" : ""}`}
                  >
                    {isEditing ? (
                      /* Inline edit form */
                      <form action={saveEditAction} className="space-y-2">
                        <input type="hidden" name="id" value={cat.id} />
                        <div className="flex gap-2">
                          <input
                            name="name"
                            defaultValue={cat.name}
                            required
                            className="flex-1 rounded-md border px-2.5 py-1.5 text-sm focus:border-indigo-400 focus:outline-none"
                            placeholder="Название категории"
                          />
                        </div>
                        <input
                          name="description"
                          defaultValue={cat.description ?? ""}
                          className="w-full rounded-md border px-2.5 py-1.5 text-xs text-slate-600 focus:border-indigo-400 focus:outline-none"
                          placeholder="Описание (необязательно)"
                        />
                        <div className="flex gap-2">
                          <button
                            type="submit"
                            className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
                          >
                            Сохранить
                          </button>
                          <Link
                            href="/admin/dictionaries/categories"
                            className="rounded-md border px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
                          >
                            Отмена
                          </Link>
                        </div>
                      </form>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-900 truncate">
                              {cat.name}
                            </span>
                            {!cat.isActive && (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
                                скрыта
                              </span>
                            )}
                          </div>
                          {cat.description && (
                            <div className="text-xs text-slate-500 truncate mt-0.5">
                              {cat.description}
                            </div>
                          )}
                          <div className="text-xs text-slate-400 mt-0.5">
                            {noun(count, "товар", "товара", "товаров")}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          {/* Edit */}
                          <Link
                            href={`/admin/dictionaries/categories?edit=${cat.id}`}
                            className="rounded border px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                            title="Редактировать"
                          >
                            <EditOutlined />
                          </Link>
                          {/* Toggle active */}
                          <form action={toggleActiveAction}>
                            <input type="hidden" name="id" value={cat.id} />
                            <input
                              type="hidden"
                              name="isActive"
                              value={String(cat.isActive)}
                            />
                            <button
                              type="submit"
                              className={`rounded border px-2 py-1 text-xs hover:bg-slate-50 ${
                                cat.isActive
                                  ? "text-slate-500"
                                  : "text-emerald-700"
                              }`}
                              title={cat.isActive ? "Скрыть" : "Показать"}
                            >
                              {cat.isActive ? "Скрыть" : "Показать"}
                            </button>
                          </form>
                          {/* Delete */}
                          <Link
                            href={`/admin/dictionaries/categories?confirm=${cat.id}`}
                            className="rounded border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                            title="Удалить"
                          >
                            Удалить
                          </Link>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Add form */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 space-y-3 lg:self-start">
          <div className="text-sm font-semibold text-slate-800">
            Добавить категорию
          </div>
          <form action={createAction} className="space-y-2">
            <div>
              <label className="text-xs font-medium text-slate-600">
                Название <span className="text-red-500">*</span>
              </label>
              <input
                name="name"
                required
                className="mt-1 w-full rounded-md border px-2.5 py-1.5 text-sm focus:border-indigo-400 focus:outline-none"
                placeholder="Например: Двигатель"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">
                Описание
              </label>
              <input
                name="description"
                className="mt-1 w-full rounded-md border px-2.5 py-1.5 text-sm text-slate-700 focus:border-indigo-400 focus:outline-none"
                placeholder="Необязательно"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Добавить
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

function noun(n: number, one: string, few: string, many: string) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return `${n} ${many}`;
  if (mod10 === 1) return `${n} ${one}`;
  if (mod10 >= 2 && mod10 <= 4) return `${n} ${few}`;
  return `${n} ${many}`;
}
