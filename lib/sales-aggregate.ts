export type SaleSummary = {
  reportDate: Date;
  productName: string;
  amount: number;
  cogs: number;
  paymentMethod: string;
  category?: string;
};

export type ExpenseSummary = {
  month: Date;
  type: "fixed" | "variable";
  category: string;
  amount: number;
  notes?: string;
};

export type Totals = {
  count: number;
  revenue: number;
  cogs: number;
  profit: number;
  margin: number; // 0..1
};

export function totalsFor(sales: SaleSummary[]): Totals {
  const revenue = sales.reduce((s, x) => s + x.amount, 0);
  const cogs = sales.reduce((s, x) => s + x.cogs, 0);
  const profit = revenue - cogs;
  const margin = revenue > 0 ? profit / revenue : 0;
  return { count: sales.length, revenue, cogs, profit, margin };
}

export function filterByDate(
  sales: SaleSummary[],
  from: Date,
  to?: Date,
): SaleSummary[] {
  return sales.filter((s) => {
    if (s.reportDate < from) return false;
    if (to && s.reportDate > to) return false;
    return true;
  });
}

export function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setUTCHours(0, 0, 0, 0);
  return out;
}

export function daysAgo(n: number, ref: Date = new Date()): Date {
  const d = startOfDay(ref);
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

export type DailyPoint = {
  date: string; // YYYY-MM-DD
  revenue: number;
  profit: number;
  count: number;
};

export function dailyTrend(
  sales: SaleSummary[],
  days: number,
  ref: Date = new Date(),
): DailyPoint[] {
  const today = startOfDay(ref);
  const out: DailyPoint[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(today);
    day.setUTCDate(day.getUTCDate() - i);
    const key = day.toISOString().slice(0, 10);
    const sameDay = sales.filter(
      (s) => s.reportDate.toISOString().slice(0, 10) === key,
    );
    const revenue = sameDay.reduce((s, x) => s + x.amount, 0);
    const cogs = sameDay.reduce((s, x) => s + x.cogs, 0);
    out.push({
      date: key,
      revenue,
      profit: revenue - cogs,
      count: sameDay.length,
    });
  }

  return out;
}

export type PaymentSlice = {
  method: string;
  revenue: number;
  count: number;
};

export function byPayment(sales: SaleSummary[]): PaymentSlice[] {
  const map = new Map<string, { revenue: number; count: number }>();
  for (const s of sales) {
    const cur = map.get(s.paymentMethod) ?? { revenue: 0, count: 0 };
    cur.revenue += s.amount;
    cur.count += 1;
    map.set(s.paymentMethod, cur);
  }
  return [...map.entries()]
    .map(([method, v]) => ({ method, ...v }))
    .sort((a, b) => b.revenue - a.revenue);
}

export type TopProduct = {
  productName: string;
  units: number;
  revenue: number;
};

export function topProducts(
  sales: SaleSummary[],
  limit: number = 10,
): TopProduct[] {
  const map = new Map<string, { units: number; revenue: number }>();
  for (const s of sales) {
    const cur = map.get(s.productName) ?? { units: 0, revenue: 0 };
    cur.units += 1;
    cur.revenue += s.amount;
    map.set(s.productName, cur);
  }
  return [...map.entries()]
    .map(([productName, v]) => ({ productName, ...v }))
    .sort((a, b) => b.units - a.units)
    .slice(0, limit);
}

export function formatIDR(amount: number): string {
  return `Rp ${amount.toLocaleString("id-ID")}`;
}

export function formatIDRCompact(amount: number): string {
  if (amount >= 1_000_000) return `Rp ${(amount / 1_000_000).toFixed(1)}jt`;
  if (amount >= 1_000) return `Rp ${(amount / 1_000).toFixed(0)}rb`;
  return `Rp ${amount}`;
}

// ─── Monthly P&L ────────────────────────────────────────────────────────

// Accounting period is NOT the calendar month: it runs from the 29th of the
// previous month through the 28th, and is labeled by the CLOSING month.
// e.g. period "2026-05" (Mei) = 29 Apr 2026 .. 28 Mei 2026.
export function monthKey(d: Date): string {
  // YYYY-MM label (UTC). A date on/after the 29th rolls into the next period.
  let y = d.getUTCFullYear();
  let m = d.getUTCMonth(); // 0-based
  if (d.getUTCDate() >= 29) {
    m += 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
  }
  return `${y}-${String(m + 1).padStart(2, "0")}`;
}

export function monthBounds(monthYear: string): { start: Date; end: Date } {
  // Label month M → [29th of (M-1), 29th of M). End is exclusive, so the 28th
  // (last day of the period) is fully included. Date.UTC normalizes the
  // negative/overflowing month index across year boundaries.
  const [y, m] = monthYear.split("-").map((n) => parseInt(n, 10));
  const start = new Date(Date.UTC(y, m - 2, 29));
  const end = new Date(Date.UTC(y, m - 1, 29));
  return { start, end };
}

export function listAvailableMonths(
  sales: SaleSummary[],
  expenses: ExpenseSummary[],
): string[] {
  const months = new Set<string>();
  for (const s of sales) months.add(monthKey(s.reportDate));
  for (const e of expenses) months.add(monthKey(e.month));
  return [...months].sort().reverse(); // newest first
}

export type CategoryRollup = {
  category: string;
  units: number;
  revenue: number;
  cogs: number;
};

export function salesByCategory(sales: SaleSummary[]): CategoryRollup[] {
  const map = new Map<string, CategoryRollup>();
  for (const s of sales) {
    const cat = s.category || "Other";
    const cur = map.get(cat) ?? {
      category: cat,
      units: 0,
      revenue: 0,
      cogs: 0,
    };
    cur.units += 1;
    cur.revenue += s.amount;
    cur.cogs += s.cogs;
    map.set(cat, cur);
  }
  // Preserve a canonical order
  const order = ["Sepatu", "Jaket", "Kaos", "Celana", "Other"];
  return order
    .map((c) => map.get(c))
    .filter((x): x is CategoryRollup => !!x)
    .concat(
      [...map.values()].filter((c) => !order.includes(c.category)),
    );
}

export type ExpenseRollup = {
  category: string;
  amount: number;
};

export function expensesByCategory(
  expenses: ExpenseSummary[],
): ExpenseRollup[] {
  const map = new Map<string, number>();
  for (const e of expenses) {
    map.set(e.category, (map.get(e.category) ?? 0) + e.amount);
  }
  return [...map.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);
}

export type MonthlyPnL = {
  monthKey: string;
  fixedTotal: number;
  fixed: ExpenseRollup[];
  variableOpsTotal: number; // non-COGS variable costs (packing, ads, etc.)
  variableOps: ExpenseRollup[];
  cogsByCategory: CategoryRollup[]; // COGS via Sales.cogs grouped by category
  cogsTotal: number;
  variableTotal: number; // = cogsTotal + variableOpsTotal
  totalCosts: number; // = fixed + variable
  salesByCategory: CategoryRollup[];
  salesTotal: number;
  profit: number;
};

export function computeMonthlyPnL(
  monthYear: string,
  allSales: SaleSummary[],
  allExpenses: ExpenseSummary[],
): MonthlyPnL {
  const { start, end } = monthBounds(monthYear);

  const sales = allSales.filter(
    (s) => s.reportDate >= start && s.reportDate < end,
  );
  const expenses = allExpenses.filter(
    (e) => e.month >= start && e.month < end,
  );

  const fixed = expensesByCategory(expenses.filter((e) => e.type === "fixed"));
  const variableOps = expensesByCategory(
    expenses.filter((e) => e.type === "variable"),
  );
  const fixedTotal = fixed.reduce((s, e) => s + e.amount, 0);
  const variableOpsTotal = variableOps.reduce((s, e) => s + e.amount, 0);

  const salesCategories = salesByCategory(sales);
  const cogsByCat: CategoryRollup[] = salesCategories.map((c) => ({
    category: c.category,
    units: c.units,
    revenue: 0, // unused in cogs context
    cogs: c.cogs,
  }));
  const cogsTotal = cogsByCat.reduce((s, c) => s + c.cogs, 0);

  const variableTotal = cogsTotal + variableOpsTotal;
  const totalCosts = fixedTotal + variableTotal;
  const salesTotal = salesCategories.reduce((s, c) => s + c.revenue, 0);
  const profit = salesTotal - totalCosts;

  return {
    monthKey: monthYear,
    fixed,
    fixedTotal,
    variableOps,
    variableOpsTotal,
    cogsByCategory: cogsByCat,
    cogsTotal,
    variableTotal,
    totalCosts,
    salesByCategory: salesCategories,
    salesTotal,
    profit,
  };
}
