import { getPayload } from "payload";
import config from "@payload-config";
import { DashboardAnalytics } from "@/components/DashboardAnalytics";
import { percentToRate, type InvestorShare } from "@/lib/investor-shares";
import {
  daysAgo,
  filterByDate,
  listAvailableMonths,
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

  const investorsResult = await payload.find({
    collection: "investors",
    where: { active: { equals: true } },
    limit: 100,
    sort: "sortOrder",
  });
  const investors: InvestorShare[] = investorsResult.docs.map(
    (d: Record<string, unknown>) => ({
      id: String(d.id),
      name: (d.name as string) ?? "",
      rate: percentToRate(Number(d.sharePercent) || 0),
    }),
  );

  const today = daysAgo(0);
  const last7 = daysAgo(6);
  const availableMonths = listAvailableMonths(sales, expenses);

  const missingCategoryCount = sales.filter((s) => !s.category).length;

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <DashboardAnalytics
        sales={sales}
        expenses={expenses}
        availableMonths={availableMonths}
        investors={investors}
        fixedKpis={{
          today: totalsFor(filterByDate(sales, today)),
          last7: totalsFor(filterByDate(sales, last7)),
          all: totalsFor(sales),
        }}
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
