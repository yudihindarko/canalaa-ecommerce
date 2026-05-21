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

const PAYMENT_ALIASES: Record<string, string> = {
  TF: "TF",
  TRF: "TF",
  TRANSFER: "TF",
  BANK: "TF",
  CASH: "CASH",
  TUNAI: "CASH",
  KAS: "CASH",
  QRIS: "QRIS",
  QR: "QRIS",
  SHOPEE: "SHOPEE",
  SHOPE: "SHOPEE",
  SP: "SHOPEE",
  TIKTOK: "TIKTOK",
  TIKTOKSHOP: "TIKTOK",
  TT: "TIKTOK",
};

export function normalizePayment(raw: string): string {
  return PAYMENT_ALIASES[raw.toUpperCase()] ?? "OTHER";
}

export function parseIndonesianDate(text: string): Date | null {
  // "12 MEI 2026", "12 Mei 2026", "12/05/2026", "2026-05-12", "12-05-2026"
  const t = text.trim();

  const dmyText = t.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (dmyText) {
    const day = parseInt(dmyText[1], 10);
    const monthIdx = INDO_MONTHS.indexOf(dmyText[2].toUpperCase().slice(0, 3));
    const year = parseInt(dmyText[3], 10);
    if (monthIdx !== -1) {
      const d = new Date(Date.UTC(year, monthIdx, day));
      if (!Number.isNaN(d.getTime())) return d;
    }
  }

  const iso = t.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    const d = new Date(
      Date.UTC(
        parseInt(iso[1], 10),
        parseInt(iso[2], 10) - 1,
        parseInt(iso[3], 10),
      ),
    );
    if (!Number.isNaN(d.getTime())) return d;
  }

  const dmySlash = t.match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (dmySlash) {
    const d = new Date(
      Date.UTC(
        parseInt(dmySlash[3], 10),
        parseInt(dmySlash[2], 10) - 1,
        parseInt(dmySlash[1], 10),
      ),
    );
    if (!Number.isNaN(d.getTime())) return d;
  }

  return null;
}

export type ParsedSaleItem = {
  itemNumber: number;
  productName: string;
  amount: number;
  cogs: number;
  paymentMethod: string;
  rawLine: string;
};

// Matches: "1. [CODE,] PRODUCT NAME(SELL-METHOD, COGS)"
// Capture groups: number, optionalCode, productName, sell, method, cogs
const LINE_REGEX =
  /^\s*(\d+)\.\s*(?:([^,(]+),\s*)?(.+?)\s*\(\s*(\d+(?:[.,]\d+)?)\s*[-–]\s*([A-Za-z]+)\s*,\s*(\d+(?:[.,]\d+)?)\s*\)\s*$/;

function parseAmountThousands(raw: string): number {
  const n = parseFloat(raw.replace(",", "."));
  return Math.round(n * 1000);
}

export function parseSaleLine(line: string): ParsedSaleItem | null {
  const m = line.match(LINE_REGEX);
  if (!m) return null;
  const itemNumber = parseInt(m[1], 10);
  const productName = m[3].trim();
  const amount = parseAmountThousands(m[4]);
  const paymentMethod = normalizePayment(m[5]);
  const cogs = parseAmountThousands(m[6]);

  if (
    !Number.isFinite(itemNumber) ||
    !productName ||
    !Number.isFinite(amount) ||
    !Number.isFinite(cogs)
  ) {
    return null;
  }

  return {
    itemNumber,
    productName,
    amount,
    cogs,
    paymentMethod,
    rawLine: line.trim(),
  };
}

export type ParsedSalesReport = {
  reportDate: Date | null;
  items: ParsedSaleItem[];
  unparsedLines: string[];
  hasHeader: boolean;
};

const HEADER_HINT = /TODAY|HARI\s*INI|REPORT|LAPORAN/i;
const ITEM_LIKE = /^\s*\d+\.\s/;

export function parseSalesReport(text: string): ParsedSalesReport {
  const lines = text.split("\n");
  let reportDate: Date | null = null;
  let hasHeader = false;
  const items: ParsedSaleItem[] = [];
  const unparsedLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Date / header line
    if (!reportDate) {
      const cleaned = trimmed.replace(HEADER_HINT, "").trim();
      const parsed = parseIndonesianDate(cleaned);
      if (parsed) {
        reportDate = parsed;
        hasHeader = HEADER_HINT.test(trimmed);
        continue;
      }
    }

    if (ITEM_LIKE.test(trimmed)) {
      const item = parseSaleLine(trimmed);
      if (item) {
        items.push(item);
      } else {
        unparsedLines.push(trimmed);
      }
    }
  }

  return { reportDate, items, unparsedLines, hasHeader };
}

/**
 * Heuristic: does this message look like a sales report (vs. random text)?
 * Used for auto-detection in webhook handler.
 */
export function looksLikeSalesReport(text: string): boolean {
  const headerOrDate =
    HEADER_HINT.test(text) ||
    /\b\d{1,2}\s+(JAN|FEB|MAR|APR|MEI|JUN|JUL|AGU|AGS|SEP|OKT|NOV|DES)/i.test(
      text,
    );
  const hasItem = /^\s*\d+\.\s.+\(\d+/m.test(text);
  return headerOrDate && hasItem;
}
