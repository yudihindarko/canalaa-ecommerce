const INDO_MONTHS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MEI",
  "JUN",
  "JUL",
  "AGU",
  "AGS",
  "SEP",
  "OKT",
  "NOV",
  "DES",
];

const HEADER_HINT = /^\s*(BIAYA|PENGELUARAN|EXPENSES|OPS|OPEX)\b/i;

// Order matters: longer/more specific patterns first.
const KEYWORD_MAP: Array<[RegExp, string]> = [
  [/^kaos[\s-]*kaki/i, "kaos-kaki"],
  [/^sewa[\s-]*toko|^sewa/i, "sewa-toko"],
  [/^gaji[\s-]*karyawan|^gaji/i, "gaji-karyawan"],
  [/^bonus[\s-]*karyawan|^bonus/i, "bonus-karyawan"],
  [/^thr/i, "thr"],
  [/^renovasi[\s-]*\+?\s*modal|^renovasi|^modal/i, "renovasi-modal"],
  [/^konsumsi|^makan|^minum/i, "konsumsi"],
  [/^internet|^wifi/i, "internet"],
  [/^listrik/i, "listrik"],
  [/^plastik/i, "plastik"],
  [/^kardus/i, "kardus"],
  [/^maintenance|^maintanance|^perawatan\s*toko/i, "maintenance"],
  [/^ads(\s*ig)?|^iklan/i, "ads-ig"],
  [/^shoes?\s*care|^perawatan(\s*sepatu)?/i, "shoes-care"],
  [/^price\s*tag|^tag\s*harga/i, "price-tag"],
  [/^other|^lainnya/i, "other"],
];

export const FIXED_EXPENSE_CATEGORIES = new Set([
  "internet",
  "listrik",
  "sewa-toko",
  "gaji-karyawan",
  "bonus-karyawan",
  "thr",
  "konsumsi",
  "renovasi-modal",
]);

// Human-readable labels mirroring collections/Expenses.ts.
export const EXPENSE_LABEL: Record<string, string> = {
  internet: "Internet",
  listrik: "Listrik",
  "sewa-toko": "Sewa Toko",
  "gaji-karyawan": "Gaji Karyawan",
  "bonus-karyawan": "Bonus Karyawan",
  thr: "THR",
  konsumsi: "Konsumsi (Makan & Minum)",
  "renovasi-modal": "Renovasi + Modal",
  plastik: "Packing - Plastik",
  kardus: "Packing - Kardus",
  "kaos-kaki": "Packing - Kaos Kaki",
  maintenance: "Maintenance Toko",
  "ads-ig": "Ads Instagram",
  "shoes-care": "Shoes Care",
  "price-tag": "Price Tag",
  other: "Other",
};

export type ParsedExpenseItem = {
  category: string;
  type: "fixed" | "variable";
  amount: number;
  raw: string;
};

export type ParsedExpenseReport = {
  monthDate: Date | null;
  items: ParsedExpenseItem[];
  unparsedLines: string[];
};

function parseAmountThousands(raw: string): number {
  const cleaned = raw.replace(/[,_](?=\d{3}\b)/g, "");
  const normalized = cleaned.replace(",", ".");
  const n = parseFloat(normalized);
  if (!Number.isFinite(n)) return NaN;
  return Math.round(n * 1000);
}

const LINE_REGEX = /^([A-Za-z][A-Za-z\s\-+]+?)\s+([\d.,]+)\s*$/;

export function parseExpenseLine(line: string): ParsedExpenseItem | null {
  const m = line.trim().match(LINE_REGEX);
  if (!m) return null;
  const text = m[1].trim();
  const amount = parseAmountThousands(m[2]);
  if (!Number.isFinite(amount)) return null;

  for (const [re, slug] of KEYWORD_MAP) {
    if (re.test(text)) {
      return {
        category: slug,
        type: FIXED_EXPENSE_CATEGORIES.has(slug) ? "fixed" : "variable",
        amount,
        raw: line.trim(),
      };
    }
  }
  return null;
}

function parseHeaderMonth(text: string): Date | null {
  const stripped = text.replace(HEADER_HINT, "").trim();
  // "FEB 2026", "Februari 2026", "12 FEB 2026"
  const m = stripped.match(/(?:\d{1,2}\s+)?([A-Za-z]+)\s+(\d{4})/);
  if (!m) return null;
  const monthIdx = INDO_MONTHS.indexOf(m[1].toUpperCase().slice(0, 3));
  const year = parseInt(m[2], 10);
  if (monthIdx === -1 || !Number.isFinite(year)) return null;
  return new Date(Date.UTC(year, monthIdx, 1));
}

export function parseExpenseReport(text: string): ParsedExpenseReport {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  let monthDate: Date | null = null;
  const items: ParsedExpenseItem[] = [];
  const unparsedLines: string[] = [];

  for (const line of lines) {
    if (!monthDate) {
      const m = parseHeaderMonth(line);
      if (m) {
        monthDate = m;
        continue;
      }
    }

    // Pure header line without a date — skip
    if (HEADER_HINT.test(line) && !/\d/.test(line)) continue;

    const parsed = parseExpenseLine(line);
    if (parsed) {
      items.push(parsed);
    } else {
      unparsedLines.push(line);
    }
  }

  return { monthDate, items, unparsedLines };
}

export function looksLikeExpenseReport(text: string): boolean {
  if (!HEADER_HINT.test(text)) return false;
  // At least one parseable expense line
  return /^[A-Za-z][A-Za-z\s\-+]+\s+[\d.,]+\s*$/m.test(text);
}
