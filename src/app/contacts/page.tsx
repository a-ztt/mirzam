import {
  EnvironmentOutlined,
  PhoneOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import WhatsAppIcon from "../WhatsAppIcon";

const PHONE_DISPLAY = "+7 701 522 10 47";
const PHONE_TEL = "+77015221047";

export default function ContactsPage() {
  const waHref = `https://wa.me/77015221047?text=${encodeURIComponent(
    "Здравствуйте! Хочу уточнить наличие запчасти.",
  )}`;

  return (
    <main className="mx-auto max-w-4xl space-y-4">
      <section className="relative animate-fade-up overflow-hidden rounded-2xl border border-ink-line bg-ink p-5 text-white shadow-plate sm:p-6">
        <span
          aria-hidden
          className="absolute left-2.5 top-2.5 size-1.5 rounded-full bg-white/20 shadow-[inset_0_1px_1px_rgba(0,0,0,0.7)]"
        />
        <span
          aria-hidden
          className="absolute right-2.5 top-2.5 size-1.5 rounded-full bg-white/20 shadow-[inset_0_1px_1px_rgba(0,0,0,0.7)]"
        />
        <span
          aria-hidden
          className="absolute bottom-2.5 left-2.5 size-1.5 rounded-full bg-white/20 shadow-[inset_0_1px_1px_rgba(0,0,0,0.7)]"
        />
        <span
          aria-hidden
          className="absolute bottom-2.5 right-2.5 size-1.5 rounded-full bg-white/20 shadow-[inset_0_1px_1px_rgba(0,0,0,0.7)]"
        />
        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-signal sm:text-[11px]">
          mirzam.kz · связь с продавцом
        </div>
        <h1 className="mt-2 font-display text-2xl uppercase tracking-wide sm:text-3xl">
          Контакты
        </h1>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-slate-300">
          Заказ оформляем по телефону или в WhatsApp. Наличие проверяем сразу —
          обычно отвечаем в течение рабочего дня.
        </p>
      </section>

      <section className="stagger grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-steel bg-white p-4 shadow-card">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-soft text-brand">
            <PhoneOutlined style={{ fontSize: 16 }} />
          </div>
          <div className="mt-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Телефон
          </div>
          <a
            href={`tel:${PHONE_TEL}`}
            className="mt-1 block font-mono text-lg font-semibold text-ink transition-colors hover:text-brand"
          >
            {PHONE_DISPLAY}
          </a>
          <p className="mt-1.5 text-xs text-slate-500">
            Звонок или SMS — как удобнее.
          </p>
        </div>

        <div className="rounded-2xl border border-steel bg-white p-4 shadow-card">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <WhatsAppIcon className="h-4 w-4" />
          </div>
          <div className="mt-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            WhatsApp
          </div>
          <a
            href={waHref}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-emerald-500 active:scale-[0.97]"
          >
            <WhatsAppIcon className="h-4 w-4" />
            Написать
          </a>
          <p className="mt-2 text-xs text-slate-500">
            Быстрее всего: фото детали или VIN — и мы подберём.
          </p>
        </div>

        <div className="rounded-2xl border border-steel bg-white p-4 shadow-card">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-signal-soft text-signal-deep">
            <EnvironmentOutlined style={{ fontSize: 16 }} />
          </div>
          <div className="mt-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Адрес
          </div>
          <div className="mt-1 text-base font-semibold text-ink">
            г. Жезказган, Казахстан
          </div>
          <p className="mt-1.5 text-xs text-slate-500">
            Самовывоз по договорённости. Доставка в другие города — обсудим в
            WhatsApp.
          </p>
        </div>
      </section>

      <section className="animate-fade-up rounded-2xl border border-steel bg-white p-4 shadow-card [animation-delay:150ms] sm:p-5">
        <h2 className="font-display text-sm uppercase tracking-wider text-ink">
          Как проходит заказ
        </h2>
        <ol className="mt-4 grid gap-4 sm:grid-cols-3">
          <li className="relative">
            <div className="font-mono text-xs font-bold text-signal-deep">
              01
            </div>
            <div className="mt-1 text-sm font-semibold text-ink">
              Соберите корзину
            </div>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Выберите детали в каталоге. Цены и остатки актуальны на сегодня.
            </p>
          </li>
          <li className="relative">
            <div className="font-mono text-xs font-bold text-signal-deep">
              02
            </div>
            <div className="mt-1 text-sm font-semibold text-ink">
              Отправьте в WhatsApp
            </div>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Заказ уйдёт одним сообщением — ничего заполнять не нужно.
            </p>
          </li>
          <li className="relative">
            <div className="font-mono text-xs font-bold text-signal-deep">
              03
            </div>
            <div className="mt-1 text-sm font-semibold text-ink">
              Подтвердим и передадим
            </div>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Проверим наличие, согласуем оплату, самовывоз или доставку.
            </p>
          </li>
        </ol>
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-steel/70 bg-paper p-3 text-xs leading-relaxed text-slate-500">
          <ClockCircleOutlined style={{ fontSize: 13 }} className="mt-0.5" />
          <span>
            График работы плавающий — надёжнее всего написать в WhatsApp:
            ответим и договоримся о времени.
          </span>
        </div>
      </section>
    </main>
  );
}
