const DATE_FORMATTER = new Intl.DateTimeFormat("ru-KZ", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

/** Дата в формате ДД.ММ.ГГГГ — «наличие и цены актуальны на …». */
export function formatToday(date: Date = new Date()) {
  return DATE_FORMATTER.format(date);
}
