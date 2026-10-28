import Link from "next/link";
import { redirect } from "next/navigation";
import { TagsOutlined, BarcodeOutlined, EditOutlined } from "@ant-design/icons";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { invalidateMockProductsCache } from "@/lib/mockProducts";

export const runtime = "nodejs";

const UNSORTED_BRAND = "Прочее";

function normalizeName(s: string) {
  return s.trim().replace(/\s+/g, " ");
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

type SearchParams = {
  tab?: string;
  confirm?: string;
  confirmType?: string;
  edit?: string;
  editType?: string;
  ok?: string;
};

type PageProps = {
  searchParams?: Promise<SearchParams>;
};

export default async function BrandsUnitsPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  const sp = (await searchParams) ?? {};
  const tab = sp.tab === "units" ? "units" : "brands";
  const confirmId = sp.confirm ?? "";
  const confirmType = sp.confirmType ?? tab;
  const editId = sp.edit ?? "";
  const editType = sp.editType ?? tab;

  // ============================================================
  // BRANDS ACTIONS
  // ============================================================

  async function createBrandAction(formData: FormData) {
    "use server";
    if (!(await getSession())) redirect("/admin/login");

    const name = normalizeName(String(formData.get("name") ?? ""));
    if (!name) redirect("/admin/dictionaries/brands-units?tab=brands&ok=empty");

    const existingBrands = await prisma.brand.findMany({
      select: { id: true, name: true, isActive: true },
    });
    const existing = existingBrands.find(
      (b) => b.name.trim().toLowerCase() === name.toLowerCase(),
    );

    if (existing) {
      if (!existing.isActive) {
        await prisma.brand.update({
          where: { id: existing.id },
          data: { isActive: true },
        });
        redirect("/admin/dictionaries/brands-units?tab=brands&ok=restored");
      }
      redirect("/admin/dictionaries/brands-units?tab=brands&ok=exists");
    }

    await prisma.brand.create({ data: { name, isActive: true } });
    redirect("/admin/dictionaries/brands-units?tab=brands&ok=created");
  }

  async function saveEditBrandAction(formData: FormData) {
    "use server";
    if (!(await getSession())) redirect("/admin/login");

    const id = String(formData.get("id") ?? "").trim();
    const newName = normalizeName(String(formData.get("name") ?? ""));
    const description =
      String(formData.get("description") ?? "").trim() || null;

    if (!id || !newName)
      redirect("/admin/dictionaries/brands-units?tab=brands");

    const brand = await prisma.brand.findUnique({ where: { id } });
    if (!brand) redirect("/admin/dictionaries/brands-units?tab=brands");

    const oldName = brand!.name;

    if (oldName !== newName) {
      const allBrands = await prisma.brand.findMany({
        select: { id: true, name: true },
      });
      const conflict = allBrands.find(
        (b) =>
          b.id !== id && b.name.trim().toLowerCase() === newName.toLowerCase(),
      );
      if (conflict)
        redirect("/admin/dictionaries/brands-units?tab=brands&ok=exists");

      await prisma.product.updateMany({
        where: { brand: oldName },
        data: { brand: newName },
      });
    }

    await prisma.brand.update({
      where: { id },
      data: { name: newName, description },
    });
    invalidateMockProductsCache();
    redirect("/admin/dictionaries/brands-units?tab=brands&ok=saved");
  }

  async function deleteBrandAction(formData: FormData) {
    "use server";
    if (!(await getSession())) redirect("/admin/login");

    const id = String(formData.get("id") ?? "").trim();
    const reassign = String(formData.get("reassign") ?? "") === "1";

    if (!id) redirect("/admin/dictionaries/brands-units?tab=brands");

    const brand = await prisma.brand.findUnique({ where: { id } });
    if (!brand) redirect("/admin/dictionaries/brands-units?tab=brands");

    if (reassign) {
      await prisma.brand.upsert({
        where: { name: UNSORTED_BRAND },
        update: { isActive: true },
        create: { name: UNSORTED_BRAND, isActive: true },
      });
      await prisma.product.updateMany({
        where: { brand: brand!.name },
        data: { brand: UNSORTED_BRAND },
      });
    } else {
      await prisma.product.updateMany({
        where: { brand: brand!.name },
        data: { brand: null },
      });
    }

    await prisma.brand.delete({ where: { id } });
    invalidateMockProductsCache();
    redirect("/admin/dictionaries/brands-units?tab=brands&ok=deleted");
  }

  async function toggleBrandAction(formData: FormData) {
    "use server";
    if (!(await getSession())) redirect("/admin/login");

    const id = String(formData.get("id") ?? "").trim();
    const current = String(formData.get("isActive") ?? "") === "true";
    if (!id) redirect("/admin/dictionaries/brands-units?tab=brands");

    await prisma.brand.update({ where: { id }, data: { isActive: !current } });
    redirect("/admin/dictionaries/brands-units?tab=brands&ok=toggled");
  }

  // ============================================================
  // UNITS ACTIONS
  // ============================================================

  async function createUnitAction(formData: FormData) {
    "use server";
    if (!(await getSession())) redirect("/admin/login");

    const name = normalizeName(String(formData.get("name") ?? ""));
    if (!name) redirect("/admin/dictionaries/brands-units?tab=units&ok=empty");

    const existingUnits = await prisma.unit.findMany({
      select: { id: true, name: true, isActive: true },
    });
    const existing = existingUnits.find(
      (u) => u.name.trim().toLowerCase() === name.toLowerCase(),
    );

    if (existing) {
      if (!existing.isActive) {
        await prisma.unit.update({
          where: { id: existing.id },
          data: { isActive: true },
        });
        redirect("/admin/dictionaries/brands-units?tab=units&ok=restored");
      }
      redirect("/admin/dictionaries/brands-units?tab=units&ok=exists");
    }

    await prisma.unit.create({ data: { name, isActive: true } });
    redirect("/admin/dictionaries/brands-units?tab=units&ok=created");
  }

  async function saveEditUnitAction(formData: FormData) {
    "use server";
    if (!(await getSession())) redirect("/admin/login");

    const id = String(formData.get("id") ?? "").trim();
    const newName = normalizeName(String(formData.get("name") ?? ""));
    const description =
      String(formData.get("description") ?? "").trim() || null;

    if (!id || !newName) redirect("/admin/dictionaries/brands-units?tab=units");

    const unit = await prisma.unit.findUnique({ where: { id } });
    if (!unit) redirect("/admin/dictionaries/brands-units?tab=units");

    const oldName = unit!.name;

    if (oldName !== newName) {
      const allUnits = await prisma.unit.findMany({
        select: { id: true, name: true },
      });
      const conflict = allUnits.find(
        (u) =>
          u.id !== id && u.name.trim().toLowerCase() === newName.toLowerCase(),
      );
      if (conflict)
        redirect("/admin/dictionaries/brands-units?tab=units&ok=exists");

      await prisma.product.updateMany({
        where: { unit: oldName },
        data: { unit: newName },
      });
    }

    await prisma.unit.update({
      where: { id },
      data: { name: newName, description },
    });
    invalidateMockProductsCache();
    redirect("/admin/dictionaries/brands-units?tab=units&ok=saved");
  }

  async function deleteUnitAction(formData: FormData) {
    "use server";
    if (!(await getSession())) redirect("/admin/login");

    const id = String(formData.get("id") ?? "").trim();
    const clearUnit = String(formData.get("clearUnit") ?? "") === "1";

    if (!id) redirect("/admin/dictionaries/brands-units?tab=units");

    const unit = await prisma.unit.findUnique({ where: { id } });
    if (!unit) redirect("/admin/dictionaries/brands-units?tab=units");

    if (clearUnit) {
      await prisma.product.updateMany({
        where: { unit: unit!.name },
        data: { unit: null },
      });
    }

    await prisma.unit.delete({ where: { id } });
    invalidateMockProductsCache();
    redirect("/admin/dictionaries/brands-units?tab=units&ok=deleted");
  }

  async function toggleUnitAction(formData: FormData) {
    "use server";
    if (!(await getSession())) redirect("/admin/login");

    const id = String(formData.get("id") ?? "").trim();
    const current = String(formData.get("isActive") ?? "") === "true";
    if (!id) redirect("/admin/dictionaries/brands-units?tab=units");

    await prisma.unit.update({ where: { id }, data: { isActive: !current } });
    redirect("/admin/dictionaries/brands-units?tab=units&ok=toggled");
  }

  // ============================================================
  // DATA
  // ============================================================

  const [allBrands, allUnits, brandCountsRaw, unitCountsRaw] =
    await Promise.all([
      prisma.brand.findMany({
        orderBy: [{ isActive: "desc" }, { name: "asc" }],
      }),
      prisma.unit.findMany({
        orderBy: [{ isActive: "desc" }, { name: "asc" }],
      }),
      prisma.product.groupBy({ by: ["brand"], _count: { id: true } }),
      prisma.product.groupBy({ by: ["unit"], _count: { id: true } }),
    ]);

  const brandCountMap = new Map<string, number>();
  for (const r of brandCountsRaw) {
    if (r.brand) brandCountMap.set(r.brand, r._count.id);
  }
  const unitCountMap = new Map<string, number>();
  for (const r of unitCountsRaw) {
    if (r.unit) unitCountMap.set(r.unit, r._count.id);
  }

  const confirmBrand =
    confirmType === "brands" && confirmId
      ? (allBrands.find((b) => b.id === confirmId) ?? null)
      : null;

  const confirmUnit =
    confirmType === "units" && confirmId
      ? (allUnits.find((u) => u.id === confirmId) ?? null)
      : null;

  const editBrand =
    editType === "brands" && editId
      ? (allBrands.find((b) => b.id === editId) ?? null)
      : null;

  const editUnit =
    editType === "units" && editId
      ? (allUnits.find((u) => u.id === editId) ?? null)
      : null;

  const confirmBrandCount = confirmBrand
    ? (brandCountMap.get(confirmBrand.name) ?? 0)
    : 0;
  const confirmUnitCount = confirmUnit
    ? (unitCountMap.get(confirmUnit.name) ?? 0)
    : 0;

  const okMessages: Record<string, string> = {
    created: "Запись добавлена.",
    restored: "Запись восстановлена.",
    exists: "Такая запись уже существует.",
    saved: "Изменения сохранены.",
    deleted: "Запись удалена.",
    toggled: "Статус изменён.",
    empty: "Введите название.",
  };
  const flashMessage = sp.ok ? (okMessages[sp.ok] ?? "") : "";

  const baseUrl = `/admin/dictionaries/brands-units?tab=${tab}`;

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <main className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/admin/dictionaries"
          className="text-sm text-slate-500 hover:underline"
        >
          ← Справочники
        </Link>
        <span className="text-slate-300">/</span>
        <h1 className="text-xl font-semibold">Бренды и единицы измерения</h1>
      </div>

      {flashMessage && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          {flashMessage}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1 w-max shadow-sm">
        <Link
          href="/admin/dictionaries/brands-units?tab=brands"
          className={`rounded-lg px-4 py-2 text-sm font-medium flex items-center gap-1.5 transition-colors ${
            tab === "brands"
              ? "bg-indigo-600 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <BarcodeOutlined /> Бренды ({allBrands.length})
        </Link>
        <Link
          href="/admin/dictionaries/brands-units?tab=units"
          className={`rounded-lg px-4 py-2 text-sm font-medium flex items-center gap-1.5 transition-colors ${
            tab === "units"
              ? "bg-indigo-600 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <TagsOutlined /> Единицы ({allUnits.length})
        </Link>
      </div>

      {/* ── BRANDS TAB ── */}
      {tab === "brands" && (
        <>
          {/* Delete confirmation */}
          {confirmBrand && (
            <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4 space-y-3">
              <div className="font-semibold text-red-800">
                Удалить бренд «{confirmBrand.name}»?
              </div>
              {confirmBrandCount > 0 ? (
                <div className="text-sm text-red-700">
                  Этот бренд используется в <strong>{confirmBrandCount}</strong>{" "}
                  {noun(confirmBrandCount, "товаре", "товарах", "товарах")}.
                  Выберите что сделать с ними:
                </div>
              ) : (
                <div className="text-sm text-slate-700">
                  Бренд не используется. Можно удалить безопасно.
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {confirmBrandCount > 0 && (
                  <form action={deleteBrandAction}>
                    <input type="hidden" name="id" value={confirmBrand.id} />
                    <input type="hidden" name="reassign" value="1" />
                    <button
                      type="submit"
                      className="rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600"
                    >
                      Перевести в «{UNSORTED_BRAND}» и удалить
                    </button>
                  </form>
                )}
                <form action={deleteBrandAction}>
                  <input type="hidden" name="id" value={confirmBrand.id} />
                  <input type="hidden" name="reassign" value="0" />
                  <button
                    type="submit"
                    className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                  >
                    {confirmBrandCount > 0
                      ? "Удалить (товары останутся без бренда)"
                      : "Удалить"}
                  </button>
                </form>
                <Link
                  href={baseUrl}
                  className="rounded-md border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Отмена
                </Link>
              </div>
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <DictionaryList
              items={allBrands}
              countMap={brandCountMap}
              editId={editBrand?.id ?? ""}
              baseUrl={baseUrl}
              saveEditAction={saveEditBrandAction}
              toggleAction={toggleBrandAction}
              confirmParam="confirm"
              confirmTypeParam="brands"
              countLabel={["товар", "товара", "товаров"]}
            />
            <AddForm action={createBrandAction} label="Добавить бренд" />
          </div>
        </>
      )}

      {/* ── UNITS TAB ── */}
      {tab === "units" && (
        <>
          {/* Delete confirmation */}
          {confirmUnit && (
            <div className="rounded-xl border-2 border-red-200 bg-red-50 p-4 space-y-3">
              <div className="font-semibold text-red-800">
                Удалить единицу «{confirmUnit.name}»?
              </div>
              {confirmUnitCount > 0 ? (
                <div className="text-sm text-red-700">
                  Эта единица измерения используется в{" "}
                  <strong>{confirmUnitCount}</strong>{" "}
                  {noun(confirmUnitCount, "товаре", "товарах", "товарах")}. При
                  удалении поле «единица» будет очищено.
                </div>
              ) : (
                <div className="text-sm text-slate-700">
                  Единица не используется. Можно удалить безопасно.
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <form action={deleteUnitAction}>
                  <input type="hidden" name="id" value={confirmUnit.id} />
                  <input type="hidden" name="clearUnit" value="1" />
                  <button
                    type="submit"
                    className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                  >
                    {confirmUnitCount > 0
                      ? "Удалить (очистить поле в товарах)"
                      : "Удалить"}
                  </button>
                </form>
                <Link
                  href={baseUrl}
                  className="rounded-md border px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Отмена
                </Link>
              </div>
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <DictionaryList
              items={allUnits}
              countMap={unitCountMap}
              editId={editUnit?.id ?? ""}
              baseUrl={baseUrl}
              saveEditAction={saveEditUnitAction}
              toggleAction={toggleUnitAction}
              confirmParam="confirm"
              confirmTypeParam="units"
              countLabel={["товар", "товара", "товаров"]}
            />
            <AddForm
              action={createUnitAction}
              label="Добавить единицу"
              namePlaceholder="Например: шт, кг, л"
            />
          </div>
        </>
      )}
    </main>
  );
}

// ============================================================
// SHARED SUB-COMPONENTS
// ============================================================

type DictItem = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
};

function DictionaryList({
  items,
  countMap,
  editId,
  baseUrl,
  saveEditAction,
  toggleAction,
  confirmParam,
  confirmTypeParam,
  countLabel,
}: {
  items: DictItem[];
  countMap: Map<string, number>;
  editId: string;
  baseUrl: string;
  saveEditAction: (fd: FormData) => Promise<void>;
  toggleAction: (fd: FormData) => Promise<void>;
  confirmParam: string;
  confirmTypeParam: string;
  countLabel: [string, string, string];
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b bg-slate-50 px-4 py-2 text-xs font-medium text-slate-500 uppercase tracking-wide">
        Список ({items.length})
      </div>
      {items.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-slate-500">
          Записей пока нет
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((item) => {
            const count = countMap.get(item.name) ?? 0;
            const isEditing = editId === item.id;
            return (
              <li
                key={item.id}
                className={`px-4 py-3 ${!item.isActive ? "opacity-50" : ""}`}
              >
                {isEditing ? (
                  <form action={saveEditAction} className="space-y-2">
                    <input type="hidden" name="id" value={item.id} />
                    <input
                      name="name"
                      defaultValue={item.name}
                      required
                      className="w-full rounded-md border px-2.5 py-1.5 text-sm focus:border-indigo-400 focus:outline-none"
                      placeholder="Название"
                    />
                    <input
                      name="description"
                      defaultValue={item.description ?? ""}
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
                        href={baseUrl}
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
                          {item.name}
                        </span>
                        {!item.isActive && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
                            скрыта
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <div className="text-xs text-slate-500 truncate mt-0.5">
                          {item.description}
                        </div>
                      )}
                      <div className="text-xs text-slate-400 mt-0.5">
                        {noun(
                          count,
                          countLabel[0],
                          countLabel[1],
                          countLabel[2],
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <Link
                        href={`${baseUrl}&edit=${item.id}&editType=${confirmTypeParam}`}
                        className="rounded border px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                        title="Редактировать"
                      >
                        <EditOutlined />
                      </Link>
                      <form action={toggleAction}>
                        <input type="hidden" name="id" value={item.id} />
                        <input
                          type="hidden"
                          name="isActive"
                          value={String(item.isActive)}
                        />
                        <button
                          type="submit"
                          className={`rounded border px-2 py-1 text-xs hover:bg-slate-50 ${
                            item.isActive
                              ? "text-slate-500"
                              : "text-emerald-700"
                          }`}
                          title={item.isActive ? "Скрыть" : "Показать"}
                        >
                          {item.isActive ? "Скрыть" : "Показать"}
                        </button>
                      </form>
                      <Link
                        href={`${baseUrl}&${confirmParam}=${item.id}&confirmType=${confirmTypeParam}`}
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
  );
}

function AddForm({
  action,
  label,
  namePlaceholder = "Название",
}: {
  action: (fd: FormData) => Promise<void>;
  label: string;
  namePlaceholder?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 space-y-3 lg:self-start">
      <div className="text-sm font-semibold text-slate-800">{label}</div>
      <form action={action} className="space-y-2">
        <div>
          <label className="text-xs font-medium text-slate-600">
            Название <span className="text-red-500">*</span>
          </label>
          <input
            name="name"
            required
            className="mt-1 w-full rounded-md border px-2.5 py-1.5 text-sm focus:border-indigo-400 focus:outline-none"
            placeholder={namePlaceholder}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600">Описание</label>
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
