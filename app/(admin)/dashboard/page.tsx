import { getPayload } from "payload";
import config from "@payload-config";
import { DashboardCharts } from "@/components/DashboardCharts";
import { MonthlyPnL } from "@/components/MonthlyPnL";
import {
  byPayment,
  dailyTrend,
  daysAgo,
  filterByDate,
  listAvailableMonths,
  topProducts,
  totalsFor,
  type ExpenseSummary,
  type SaleSummary,
} from "@/lib/sales-aggregate";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: "sales",
    where: { status: { equals: "confirmed" } },
    limit: 5000,
    sort: "-reportDate",
  });

  const sales: SaleSummary[] = result.docs.map(
    (d: Record<string, unknown>) => ({
      reportDate: new Date(d.reportDate as string),
      productName: (d.productName as string) ?? "",
      amount: Number(d.amount) || 0,
      cogs: Number(d.cogs) || 0,
      paymentMethod: (d.paymentMethod as string) ?? "OTHER",
      category: (d.category as string) || undefined,
    }),
  );

  const expensesResult = await payload.find({
    collection: "expenses",
    where: { status: { equals: "confirmed" } },
    limit: 1000,
    sort: "-month",
  });
  const expenses: ExpenseSummary[] = expensesResult.docs.map(
    (d: Record<string, unknown>) => ({
      month: new Date(d.month as string),
      type: (d.type as "fixed" | "variable") ?? "variable",
      category: (d.category as string) ?? "other",
      amount: Number(d.amount) || 0,
      notes: (d.notes as string) || undefined,
    }),
  );

  const today = daysAgo(0);
  const last7 = daysAgo(6);
  const last30 = daysAgo(29);

  const totalsToday = totalsFor(filterByDate(sales, today));
  const totals7 = totalsFor(filterByDate(sales, last7));
  const totals30 = totalsFor(filterByDate(sales, last30));
  const totalsAll = totalsFor(sales);

  const trend = dailyTrend(sales, 30);
  const payments = byPayment(filterByDate(sales, last30));
  const top = topProducts(filterByDate(sales, last30), 10);
  const availableMonths = listAvailableMonths(sales, expenses);

  const missingCategoryCount = sales.filter((s) => !s.category).length;

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <DashboardCharts
        kpis={{
          today: totalsToday,
          last7: totals7,
          last30: totals30,
          all: totalsAll,
        }}
        trend={trend}
        payments={payments}
        top={top}
        empty={sales.length === 0}
      />

      <MonthlyPnL
        sales={sales}
        expenses={expenses}
        availableMonths={availableMonths}
      />

      {missingCategoryCount > 0 && <BackfillBanner count={missingCategoryCount} />}
    </div>
  );
}

function BackfillBanner({ count }: { count: number }) {
  return (
    <form
      action="/api/admin/backfill-categories"
      method="POST"
      className="flex flex-col gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between"
    >
      <span>
        {count} penjualan belum punya kategori. Jalankan backfill untuk
        auto-deteksi.
      </span>
      <button
        type="submit"
        className="rounded-full bg-amber-900 px-4 py-1.5 text-xs font-semibold text-amber-50 hover:bg-amber-800"
      >
        Run Backfill
      </button>
    </form>
  );
}
