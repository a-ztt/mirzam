"use client";

import { useEffect, useState } from "react";
import { formatToday } from "./today";

/**
 * Дата актуальности каталога.
 *
 * На сервере (в т.ч. при статическом пререндере) значение приходит пропом
 * `initial` и может «замёрзнуть» на дате билда, поэтому после монтирования
 * пересчитываем по часам клиента. Первый клиентский рендер совпадает с
 * серверным — гидрация не ломается.
 */
export default function TodayDate({
  initial,
  className,
}: {
  initial: string;
  className?: string;
}) {
  const [value, setValue] = useState(initial);

  useEffect(() => {
    setValue(formatToday());
  }, []);

  return <span className={className}>{value}</span>;
}
