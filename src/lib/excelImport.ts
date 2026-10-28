import "server-only";

type ExcelRow = Record<string, unknown>;

export type ExcelImportProduct = {
  slug: string;
  title: string;
  category?: string;
  sku?: string;
  unit?: string;
  qty?: number;
  priceKzt?: number;
  description?: string;
};

export function readProductsFromExcel(): ExcelImportProduct[] {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require("node:fs") as typeof import("node:fs");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const path = require("node:path") as typeof import("node:path");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const XLSX = require("xlsx") as typeof import("xlsx");

  const products: ExcelImportProduct[] = [];

  // Batch import: put multiple Excel files into data/import/*.xlsx
  const importDir = path.join(process.cwd(), "data", "import");
  const importFiles: string[] = [];
  try {
    if (fs.existsSync(importDir) && fs.statSync(importDir).isDirectory()) {
      for (const name of fs.readdirSync(importDir)) {
        if (!name.toLowerCase().endsWith(".xlsx")) continue;
        importFiles.push(path.join(importDir, name));
      }
    }
  } catch {
    // ignore
  }

  // Backward compatible single-file import.
  const legacyPath = path.join(process.cwd(), "data", "products.xlsx");
  const filesToRead = importFiles.length
    ? importFiles
    : fs.existsSync(legacyPath)
      ? [legacyPath]
      : [];
  if (!filesToRead.length) return [];

  for (const filePath of filesToRead) {
    try {
      const buffer = fs.readFileSync(filePath);
      const wb = XLSX.read(buffer, { type: "buffer" });
      const sourceId = getSourceId(
        path.basename(filePath, path.extname(filePath)),
      );

      let best: ExcelImportProduct[] = [];
      for (const sheetName of wb.SheetNames) {
        const ws = wb.Sheets[sheetName];
        if (!ws) continue;
        const parsed = parseWorksheet(XLSX, ws, {
          sheetName,
          sourceId,
          keepLegacySlug: filePath === legacyPath,
        });
        if (parsed.length > best.length) best = parsed;
      }

      if (!best.length) {
        console.warn(
          `[excelImport] No products parsed from ${path.basename(filePath)}`,
        );
        continue;
      }

      products.push(...best);
    } catch (e) {
      console.warn(
        `[excelImport] Failed reading ${path.basename(filePath)}`,
        e,
      );
    }
  }

  return products;
}

function parseWorksheet(
  XLSX: typeof import("xlsx"),
  ws: import("xlsx").WorkSheet,
  opts: { sheetName: string; sourceId: string; keepLegacySlug: boolean },
): ExcelImportProduct[] {
  // We need to support multiple tables inside one worksheet.
  // Typical layout:
  // 1) Title row (merged cell): "Запчасти ..."
  // 2) Header row: "№ п-п", "Наименование ТМЦ", "Номер по каталогу", ...
  // 3) Data rows
  const aoa = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    defval: "",
    raw: false,
    blankrows: false,
  }) as unknown as Array<Array<unknown>>;

  const products: ExcelImportProduct[] = [];
  const knownHeaders = getKnownHeaderSet();

  let currentTableTitle: string | undefined;
  let tableIndex = 0;

  let r = 0;
  while (r < aoa.length) {
    const row = aoa[r] ?? [];
    const headerScore = scoreHeaderRow(row, knownHeaders);

    if (headerScore === 0) {
      const maybeTitle = extractTitleFromRow(row);
      if (maybeTitle) currentTableTitle = maybeTitle;
      r++;
      continue;
    }

    if (headerScore >= 2) {
      const headerMap = buildHeaderMap(row);
      const tableIdBase = makeTableId(
        currentTableTitle ?? opts.sheetName ?? "table",
      );
      const tableId = `${tableIdBase}-${tableIndex + 1}`;
      const category = currentTableTitle || opts.sheetName || "Каталог";
      tableIndex++;
      r++; // move to first data row

      let blankStreak = 0;
      let dataIndex = 0;
      while (r < aoa.length) {
        const dataRow = aoa[r] ?? [];

        if (isRowBlank(dataRow)) {
          blankStreak++;
          r++;
          if (blankStreak >= 2) break;
          continue;
        }
        blankStreak = 0;

        const nextHeaderScore = scoreHeaderRow(dataRow, knownHeaders);
        if (nextHeaderScore >= 2 && dataIndex > 0) break;

        const nextTitle = extractTitleFromRow(dataRow);
        if (nextTitle && dataIndex > 0) {
          currentTableTitle = nextTitle;
          break;
        }

        const title = String(
          getByHeaderAliases(dataRow, headerMap, [
            "Наименование",
            "Наимeнование",
            "Наименованиe",
            "Наименование товара",
            "Наименование ТМЦ",
            "Товар",
            "Название",
            "Name",
          ]) ?? "",
        ).trim();
        if (!title) {
          r++;
          continue;
        }

        const rowNoRaw = getByHeaderAliases(dataRow, headerMap, [
          "№",
          "№ п-п",
          "№пп",
          "No",
          "N",
          "Номер",
          "Позиция",
          "Строка",
        ]);
        const rowNo =
          typeof rowNoRaw === "number"
            ? rowNoRaw
            : Number.parseInt(String(rowNoRaw ?? ""), 10);
        const stableNo = Number.isFinite(rowNo) ? rowNo : dataIndex + 1;

        const sku = String(
          getByHeaderAliases(dataRow, headerMap, [
            "№ по каталогу",
            "No по каталогу",
            "Номер по каталогу",
            "Артикул",
            "Артикул товара",
            "SKU",
            "Part number",
            "Каталожный номер",
          ]) ?? "",
        ).trim();

        const unit = String(
          getByHeaderAliases(dataRow, headerMap, [
            "Ед.изм",
            "ед.изм",
            "Ед. изм",
            "ед. изм",
            "Ед изм",
            "ед изм",
            "Ед. изм.",
            "Ед.изм.",
            "Unit",
          ]) ?? "",
        ).trim();

        const qty = parseOptionalIntLike(
          getByHeaderAliases(dataRow, headerMap, [
            "К-во",
            "к-во",
            "Кол-во",
            "кол-во",
            "Количество",
            "Остаток",
            "Наличие",
            "Qty",
          ]),
        );

        const priceKzt = parseKzt(
          getByHeaderAliases(dataRow, headerMap, [
            "Цена",
            "цена",
            "Price",
            "Стоимость",
            "Цена, тг",
            "Цена, ₸",
            "Цена за ед.",
            "Цена за ед",
            "Цена за единицу",
          ]),
        );

        const sumKzt = parseKzt(
          getByHeaderAliases(dataRow, headerMap, [
            "Сумма",
            "сумма",
            "Total",
            "Итого",
          ]),
        );

        const descriptionParts: string[] = [];
        if (unit) descriptionParts.push(`Ед. изм.: ${unit}`);
        if (typeof sumKzt === "number")
          descriptionParts.push(`Сумма: ${sumKzt} ₸`);

        const slug = makeSlug({
          sourceId: opts.sourceId,
          tableId,
          stableNo,
          keepLegacySlug: opts.keepLegacySlug,
        });

        products.push({
          slug,
          title,
          category,
          sku: sku || undefined,
          unit: unit || undefined,
          qty,
          priceKzt,
          description: descriptionParts.length
            ? descriptionParts.join(" · ")
            : undefined,
        });

        dataIndex++;
        r++;
      }

      continue;
    }

    r++;
  }

  // Fallback: if we couldn't parse any table via AoA, try old heuristic.
  if (!products.length) {
    const headerRowIndex = detectHeaderRow(XLSX, ws);
    const rows = XLSX.utils.sheet_to_json<ExcelRow>(ws, {
      defval: "",
      raw: false,
      range: headerRowIndex,
    });

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] ?? {};
      const title = getCellString(row, [
        "Наименование",
        "Наимeнование",
        "Наименованиe",
        "Наименование товара",
        "Наименование ТМЦ",
        "Товар",
        "Название",
        "Name",
      ]);
      if (!title) continue;

      const rowNoRaw = getCell(row, ["№", "№ п-п", "No", "N", "Номер"]);
      const rowNo =
        typeof rowNoRaw === "number"
          ? rowNoRaw
          : Number.parseInt(String(rowNoRaw ?? ""), 10);
      const stableNo = Number.isFinite(rowNo) ? rowNo : i + 1;

      const sku = getCellString(row, [
        "№ по каталогу",
        "Номер по каталогу",
        "Артикул",
        "SKU",
      ]);
      const unit = getCellString(row, ["Ед.изм", "Ед. изм", "Ед.изм."]);
      const qty = parseOptionalIntLike(
        getCell(row, ["К-во", "Кол-во", "Количество", "Остаток"]),
      );
      const priceKzt = parseKzt(
        getCell(row, ["Цена", "Цена за ед.", "Price"]),
      );
      const sumKzt = parseKzt(getCell(row, ["Сумма", "Итого"]));

      const descriptionParts: string[] = [];
      if (unit) descriptionParts.push(`Ед. изм.: ${unit}`);
      if (typeof sumKzt === "number")
        descriptionParts.push(`Сумма: ${sumKzt} ₸`);

      const slug = makeSlug({
        sourceId: opts.sourceId,
        stableNo,
        keepLegacySlug: opts.keepLegacySlug,
      });

      products.push({
        slug,
        title,
        category: opts.sheetName || "Каталог",
        sku: sku || undefined,
        unit: unit || undefined,
        qty,
        priceKzt,
        description: descriptionParts.length
          ? descriptionParts.join(" · ")
          : undefined,
      });
    }
  }

  return products;
}

function getKnownHeaderSet() {
  return new Set(
    [
      "наименование",
      "наимeнование",
      "наименованиe",
      "наименование товара",
      "наименование тмц",
      "товар",
      "название",
      "name",
      "№",
      "№ п-п",
      "no",
      "номер",
      "артикул",
      "sku",
      "номер по каталогу",
      "каталожный номер",
      "едизм",
      "ед.изм",
      "колво",
      "кол-во",
      "количество",
      "остаток",
      "наличие",
      "цена",
      "цена за ед.",
      "price",
      "сумма",
      "итого",
    ].map(normalizeHeader),
  );
}

function scoreHeaderRow(row: Array<unknown>, known: Set<string>) {
  let score = 0;
  for (const cell of row) {
    const h = normalizeHeader(String(cell ?? ""));
    if (h && known.has(h)) score++;
  }
  return score;
}

function extractTitleFromRow(row: Array<unknown>) {
  // Titles are usually a single merged cell with text like "Запчасти ...".
  const texts = row
    .map((x) => String(x ?? "").trim())
    .filter(Boolean);
  if (!texts.length) return undefined;
  if (texts.length > 2) return undefined;
  const text = texts.join(" ").trim();
  if (text.length < 3) return undefined;
  // Avoid mistaking header rows for titles.
  const h = normalizeHeader(text);
  if (h === "" || h.length < 3) return undefined;
  if (h.includes("наименование") || h.includes("цена") || h.includes("колво")) return undefined;
  return text;
}

function isRowBlank(row: Array<unknown>) {
  for (const cell of row) {
    if (String(cell ?? "").trim()) return false;
  }
  return true;
}

function buildHeaderMap(headerRow: Array<unknown>) {
  const map = new Map<string, number>();
  for (let i = 0; i < headerRow.length; i++) {
    const key = normalizeHeader(String(headerRow[i] ?? ""));
    if (!key) continue;
    if (!map.has(key)) map.set(key, i);
  }
  return map;
}

function getByHeaderAliases(
  row: Array<unknown>,
  headerMap: Map<string, number>,
  aliases: string[],
) {
  for (const a of aliases) {
    const idx = headerMap.get(normalizeHeader(a));
    if (idx === undefined) continue;
    return row[idx];
  }
  return undefined;
}

function makeTableId(title: string) {
  const cleaned = title
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9а-я\-_.]+/gi, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || "table";
}

function detectHeaderRow(
  XLSX: typeof import("xlsx"),
  ws: import("xlsx").WorkSheet,
): number {
  // Read first rows as AoA and pick row with most known headers.
  const aoa = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    defval: "",
    raw: false,
    blankrows: false,
  }) as unknown as Array<Array<unknown>>;

  const known = new Set(
    [
      "наименование",
      "наимeнование",
      "наименованиe",
      "наименование товара",
      "товар",
      "название",
      "name",
      "№",
      "no",
      "номер",
      "артикул",
      "sku",
      "каталожный номер",
      "едизм",
      "ед.изм",
      "колво",
      "кол-во",
      "количество",
      "остаток",
      "наличие",
      "цена",
      "price",
      "сумма",
      "итого",
    ].map(normalizeHeader),
  );

  let bestRow = 0;
  let bestScore = 0;
  const limit = Math.min(aoa.length, 30);
  for (let r = 0; r < limit; r++) {
    const row = aoa[r] ?? [];
    let score = 0;
    for (const cell of row) {
      const h = normalizeHeader(String(cell ?? ""));
      if (h && known.has(h)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestRow = r;
    }
  }

  // If we couldn't match at least 2 headers, assume first row is header.
  return bestScore >= 2 ? bestRow : 0;
}

function getSourceId(baseName: string) {
  const cleaned = baseName
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-_.]+/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || "import";
}

function makeSlug(opts: {
  sourceId: string;
  tableId?: string;
  stableNo: number;
  keepLegacySlug: boolean;
}) {
  if (opts.keepLegacySlug) return `p-${opts.stableNo}`;
  if (opts.tableId) return `${opts.sourceId}-${opts.tableId}-p-${opts.stableNo}`;
  return `${opts.sourceId}-p-${opts.stableNo}`;
}

function parseOptionalIntLike(value?: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? Math.trunc(value) : undefined;
  }
  if (value === null || value === undefined || value === "") return undefined;
  const cleaned = String(value).replace(/\s+/g, "").replace(",", ".");
  const n = Number.parseFloat(cleaned);
  if (!Number.isFinite(n)) return undefined;
  return Math.trunc(n);
}

function parseKzt(value?: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? Math.round(value) : undefined;
  }
  if (value === null || value === undefined || value === "") return undefined;
  const cleaned = String(value)
    .replace(/\s+/g, "")
    .replace(/₸/g, "")
    .replace(/,/g, ".")
    .replace(/[^0-9.\-]/g, "");
  if (!cleaned) return undefined;
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? Math.round(n) : undefined;
}

function normalizeHeader(value: string) {
  return value
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/№/g, "no")
    .replace(/[^a-z0-9а-я]+/gi, "")
    .trim();
}

function getCell(row: ExcelRow, keys: string[]) {
  for (const key of keys) {
    if (key in row) return row[key];
  }

  const normalizedMap = new Map<string, unknown>();
  for (const [k, v] of Object.entries(row)) {
    normalizedMap.set(normalizeHeader(k), v);
  }

  for (const key of keys) {
    const v = normalizedMap.get(normalizeHeader(key));
    if (v !== undefined) return v;
  }

  return undefined;
}

function getCellString(row: ExcelRow, keys: string[]) {
  const value = getCell(row, keys);
  return String(value ?? "").trim();
}
