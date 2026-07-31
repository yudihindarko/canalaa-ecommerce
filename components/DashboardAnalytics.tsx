"use client";

import { useMemo, useState } from "react";
import { DashboardCharts } from "@/components/DashboardCharts";
import { InvestorShareCard } from "@/components/InvestorShareCard";
import { MonthlyPnL } from "@/components/MonthlyPnL";
import { exportDashboardPdf } from "@/lib/export-dashboard-pdf";
import type { InvestorShare } from "@/lib/investor-shares";
import {
  byPayment,
  computeMonthlyPnL,
  dailyTrendForPeriod,
  filterByPeriod,
  formatMonthLabel,
  formatPeriodRange,
  monthBounds,
  monthKey,
  topProducts,
  totalsFor,
  type ExpenseSummary,
  type SaleSummary,
  type Totals,
} from "@/lib/sales-aggregate";

function reviveSales(sales: SaleSummary[]): SaleSummary[] {
  return sales.map((s) => ({
    ...s,
    reportDate: new Date(s.reportDate),
  }));
}

function reviveExpenses(expenses: ExpenseSummary[]): ExpenseSummary[] {
  return expenses.map((e) => ({
    ...e,
    month: new Date(e.month),
  }));
}

export function DashboardAnalytics({
  sales: rawSales,
  expenses: rawExpenses,
  availableMonths,
  fixedKpis,
  investors,
}: {
  sales: SaleSummary[];
  expenses: ExpenseSummary[];
  availableMonths: string[];
  fixedKpis: { today: Totals; last7: Totals; all: Totals };
  investors: InvestorShare[];
}) {
  const sales = useMemo(() => reviveSales(rawSales), [rawSales]);
  const expenses = useMemo(() => reviveExpenses(rawExpenses), [rawExpenses]);

  const defaultMonth = useMemo(() => {
    if (availableMonths.length > 0) return availableMonths[0];
    return monthKey(new Date());
  }, [availableMonths]);

  const [selected, setSelected] = useState(defaultMonth);

  const monthOptions = useMemo(() => {
    const months = new Set(availableMonths);
    months.add(defaultMonth);
    return [...months].sort().reverse();
  }, [availableMonths, defaultMonth]);

  const { start, end } = useMemo(() => monthBounds(selected), [selected]);
  const periodLabel = useMemo(() => formatPeriodRange(selected), [selected]);
  const periodSales = useMemo(
    () => filterByPeriod(sales, start, end),
    [sales, start, end],
  );

  const periodTotals = useMemo(() => totalsFor(periodSales), [periodSales]);
  const trend = useMemo(
    () => dailyTrendForPeriod(sales, start, end),
    [sales, start, end],
  );
  const payments = useMemo(() => byPayment(periodSales), [periodSales]);
  const top = useMemo(() => topProducts(periodSales, 10), [periodSales]);
  const pnl = useMemo(
    () => computeMonthlyPnL(selected, sales, expenses),
    [selected, sales, expenses],
  );

  const handleExportPdf = () => {
    exportDashboardPdf({
      periodKey: selected,
      periodLabel: formatMonthLabel(selected),
      periodTotals,
      payments,
      top,
      trend,
      pnl,
      investors,
    });
  };

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">
          Periode akuntansi
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="rounded border border-hairline bg-background px-2 py-1 text-sm"
          >
            {monthOptions.map((m) => (
              <option key={m} value={m}>
                {formatMonthLabel(m)}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleExportPdf}
            className="rounded border border-hairline bg-foreground px-3 py-1 text-sm font-medium text-background transition-opacity hover:opacity-80"
          >
            Export PDF
          </button>
        </div>
      </div>

      <DashboardCharts
        kpis={{
          today: fixedKpis.today,
          last7: fixedKpis.last7,
          period: periodTotals,
          all: fixedKpis.all,
        }}
        periodLabel={periodLabel}
        trend={trend}
        payments={payments}
        top={top}
        empty={sales.length === 0}
      />

      <MonthlyPnL
        sales={sales}
        expenses={expenses}
        selected={selected}
        periodLabel={formatMonthLabel(selected)}
      />

      <InvestorShareCard
        netProfit={pnl.profit}
        periodLabel={formatMonthLabel(selected)}
        investors={investors}
      />
    </div>
  );
}
