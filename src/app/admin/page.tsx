import Link from "next/link";
import { redirect } from "next/navigation";

import { clearSession, getSession } from "@/lib/auth";
import { importProductsFromExcelToDb } from "@/lib/importExcelToDb";

import LogoutOutlined from "@ant-design/icons/lib/icons/LogoutOutlined";

export const runtime = "nodejs";

export default async function AdminHomePage() {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  async function logoutAction() {
    "use server";
    if (!(await getSession())) redirect("/admin/login");
    await clearSession();
    redirect("/admin/login");
  }

  async function importExcelAction() {
    "use server";
    if (!(await getSession())) redirect("/admin/login");
    const result = await importProductsFromExcelToDb();
    redirect(
      `/admin?imported=${result.processed}&created=${result.created}&updated=${result.updated}`,
    );
  }

  return (
    <main className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Админ-панель</h1>
        <form action={logoutAction}>
          <button className="rounded-md border px-3 py-2 text-sm hover:bg-slate-50">
            <LogoutOutlined /> Выйти
          </button>
        </form>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border bg-white p-4">
          <div className="text-sm font-semibold">Товары</div>
          <div className="mt-1 text-sm text-slate-600">
            Редактирование, цены, остатки, фото.
          </div>
          <div className="mt-3">
            <Link
              href="/admin/products"
              className="inline-flex rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Открыть список
            </Link>
          </div>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <div className="text-sm font-semibold">Справочники</div>
          <div className="mt-1 text-sm text-slate-600">
            Управление категориями, брендами и единицами.
          </div>
          <div className="mt-3">
            <Link
              href="/admin/dictionaries"
              className="inline-flex rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Открыть справочники
            </Link>
          </div>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <div className="text-sm font-semibold">Отзывы</div>
          <div className="mt-1 text-sm text-slate-600">
            Модерация отзывов пользователей.
          </div>
          <div className="mt-3">
            <Link
              href="/admin/reviews"
              className="inline-flex rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
            >
              Управление отзывами
            </Link>
          </div>
        </div>
        {/* <div className="rounded-xl border bg-white p-4">
          <div className="text-sm font-semibold">Импорт из Excel</div>
          <div className="mt-1 text-sm text-slate-600">
            Загружает данные из <b>data/products.xlsx</b> в базу
            (создаёт/обновляет товары).
          </div>
          <div className="mt-3">
            <form action={importExcelAction}>
              <button className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
                Импортировать Excel
              </button>
            </form>
          </div>
        </div> */}
      </div>
    </main>
  );
}
