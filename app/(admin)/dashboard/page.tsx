import { getPayload } from "payload";
import config from "@payload-config";
import { DashboardCharts } from "@/components/DashboardCharts";
import {
  byPayment,
  dailyTrend,
  daysAgo,
  filterByDate,
  topProducts,
  totalsFor,
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

  return (
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
  );
}
