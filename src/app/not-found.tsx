import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex animate-fade-up flex-col items-center justify-center py-20 text-center">
      <div className="font-mono text-xs uppercase tracking-[0.25em] text-signal-deep">
        Ошибка 404
      </div>
      <h1 className="mt-3 font-display text-3xl uppercase tracking-wide text-ink sm:text-4xl">
        Деталь не найдена
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-500">
        Такой страницы нет — возможно, товар уже продан и снят с публикации.
        Загляните в каталог: он пополняется каждый день.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-lg bg-brand px-6 py-2.5 text-sm font-bold text-white transition-all hover:bg-brand-deep active:scale-[0.98]"
      >
        Открыть каталог
      </Link>
    </main>
  );
}
