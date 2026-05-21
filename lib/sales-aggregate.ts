export type SaleSummary = {
  reportDate: Date;
  productName: string;
  amount: number;
  cogs: number;
  paymentMethod: string;
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
