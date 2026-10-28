import Link from "next/link";
import { redirect } from "next/navigation";
import {
  SettingOutlined,
  DatabaseOutlined,
  AppstoreOutlined,
  BarcodeOutlined,
  TagsOutlined,
} from "@ant-design/icons";

import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export default async function DictionariesPage() {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  const [catCount, brandCount, unitCount] = await Promise.all([
    prisma.category.count(),
    prisma.brand.count(),
    prisma.unit.count(),
  ]);

  return (
    <main className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Link href="/admin" className="text-sm text-slate-500 hover:underline">
          ← Админ-панель
        </Link>
        <span className="text-slate-300">/</span>
        <h1 className="text-xl font-semibold flex items-center gap-1.5">
          <DatabaseOutlined /> Справочники
        </h1>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Link
          href="/admin/dictionaries/categories"
          className="rounded-xl border bg-white p-4 flex flex-col gap-2 hover:border-indigo-200 hover:shadow-sm transition-all"
        >
          <div className="text-sm font-semibold flex items-center gap-1.5">
            <AppstoreOutlined className="text-indigo-500" /> Категории
          </div>
          <div className="text-sm text-slate-600">
            Управление категориями товаров. Переименование, деактивация,
            удаление с переносом товаров.
          </div>
          <div className="mt-auto text-xs text-slate-400">
            Всего записей:{" "}
            <strong className="text-slate-700">{catCount}</strong>
          </div>
        </Link>
        <Link
          href="/admin/dictionaries/brands-units"
          className="rounded-xl border bg-white p-4 flex flex-col gap-2 hover:border-indigo-200 hover:shadow-sm transition-all"
        >
          <div className="text-sm font-semibold flex items-center gap-2">
            <BarcodeOutlined className="text-indigo-500" /> Бренды
            <span className="text-slate-400">/</span>
            <TagsOutlined className="text-indigo-500" /> Единицы измерения
          </div>
          <div className="text-sm text-slate-600">
            Управление брендами и единицами измерения. Переименование, удаление.
          </div>
          <div className="mt-auto text-xs text-slate-400">
            Брендов: <strong className="text-slate-700">{brandCount}</strong>
            {" · "}
            Единиц: <strong className="text-slate-700">{unitCount}</strong>
          </div>
        </Link>
      </div>
    </main>
  );
}
