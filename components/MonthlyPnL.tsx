"use client";

import { useMemo } from "react";
import {
  computeMonthlyPnL,
  formatIDR,
  type ExpenseSummary,
  type SaleSummary,
} from "@/lib/sales-aggregate";

function Row({
  label,
  amount,
  qty,
  bold,
  muted,
}: {
  label: string;
  amount: number;
  qty?: number;
  bold?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={`flex items-baseline justify-between gap-3 py-1 text-sm ${
        bold ? "font-semibold" : ""
      } ${muted ? "text-muted" : ""}`}
    >
      <span className="flex min-w-0 items-baseline gap-2">
        <span className="truncate">{label}</span>
        {qty !== undefined && (
          <span className="text-xs text-muted">({qty}x)</span>
        )}
      </span>
      <span className="shrink-0 tabular-nums">{formatIDR(amount)}</span>
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mt-4 mb-1 text-xs font-semibold uppercase tracking-wider text-muted">
      {children}
    </h3>
  );
}

export function MonthlyPnL({
  sales,
  expenses,
  selected,
  periodLabel,
}: {
  sales: SaleSummary[];
  expenses: ExpenseSummary[];
  selected: string;
  periodLabel: string;
}) {
  const pnl = useMemo(
    () => computeMonthlyPnL(selected, sales, expenses),
    [selected, sales, expenses],
  );

  const empty =
    pnl.salesTotal === 0 && pnl.fixedTotal === 0 && pnl.variableOpsTotal === 0;

  return (
    <section className="rounded-md border border-hairline bg-background p-4 md:p-6">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider">
          Laporan Bulanan (P&L)
        </h2>
        <span className="text-xs text-muted">{periodLabel}</span>
      </div>

      {empty ? (
        <p className="py-6 text-center text-sm text-muted">
          Belum ada data untuk {periodLabel}. Tambah penjualan via Telegram +
          biaya operasional di /admin/collections/expenses.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Costs */}
          <div>
            <h3 className="text-sm font-semibold">Biaya Operasional</h3>

            <SectionHeader>Biaya Tetap</SectionHeader>
            {pnl.fixed.length === 0 && (
              <p className="text-xs text-muted">Belum ada biaya tetap.</p>
            )}
            {pnl.fixed.map((e) => (
              <Row key={`fix-${e.category}`} label={e.category} amount={e.amount} />
            ))}
            <Row label="Subtotal Tetap" amount={pnl.fixedTotal} bold />

            <SectionHeader>Biaya Variable</SectionHeader>
            {pnl.cogsByCategory.map((c) => (
              <Row
                key={`cogs-${c.category}`}
                label={`COGS — ${c.category}`}
                amount={c.cogs}
                qty={c.units}
              />
            ))}
            {pnl.variableOps.map((e) => (
              <Row key={`var-${e.category}`} label={e.category} amount={e.amount} />
            ))}
            <Row label="Subtotal Variable" amount={pnl.variableTotal} bold />

            <div className="my-3 h-px bg-hairline" />
            <Row label="TOTAL BIAYA" amount={pnl.totalCosts} bold />
          </div>

          {/* Sales + Profit */}
          <div>
            <h3 className="text-sm font-semibold">Sales</h3>

            <SectionHeader>Per Kategori</SectionHeader>
            {pnl.salesByCategory.length === 0 && (
              <p className="text-xs text-muted">Belum ada penjualan.</p>
            )}
            {pnl.salesByCategory.map((c) => (
              <Row
                key={`sales-${c.category}`}
                label={c.category}
                amount={c.revenue}
                qty={c.units}
              />
            ))}
            <Row label="Total Sales" amount={pnl.salesTotal} bold />

            <div className="my-3 h-px bg-hairline" />
            <div
              className={`flex items-baseline justify-between gap-3 rounded-md px-3 py-3 text-base font-bold ${
                pnl.profit >= 0
                  ? "bg-cream text-foreground"
                  : "bg-red-50 text-red-700"
              }`}
            >
              <span>Keuntungan</span>
              <span className="tabular-nums">{formatIDR(pnl.profit)}</span>
            </div>
            <p className="mt-2 text-xs text-muted">
              {pnl.salesTotal > 0
                ? `Margin ${((pnl.profit / pnl.salesTotal) * 100).toFixed(1)}% dari total sales`
                : "Tambah penjualan untuk lihat margin"}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
