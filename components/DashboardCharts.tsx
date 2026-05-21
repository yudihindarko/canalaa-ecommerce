"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  type DailyPoint,
  type PaymentSlice,
  type TopProduct,
  type Totals,
  formatIDR,
  formatIDRCompact,
} from "@/lib/sales-aggregate";

const CREAM = "#f2ebdd";
const FG = "#0a0a0a";
const MUTED = "#6b6b6b";

const PAYMENT_COLORS: Record<string, string> = {
  TF: "#0a0a0a",
  CASH: "#6b7280",
  SHOPEE: "#fb6643",
  TIKTOK: "#1d1d1d",
  QRIS: "#3a7bd5",
  OTHER: "#bfbfbf",
};

function colorFor(method: string): string {
  return PAYMENT_COLORS[method] ?? "#a3a3a3";
}

function KpiCard({
  label,
  totals,
  sub,
}: {
  label: string;
  totals: Totals;
  sub?: string;
}) {
  return (
    <div className="rounded-md border border-hairline bg-background p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-muted">
        {label}
      </p>
      <p className="mt-2 text-xl font-bold leading-tight md:text-2xl">
        {formatIDR(totals.revenue)}
      </p>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <span>Profit {formatIDR(totals.profit)}</span>
        <span>Margin {(totals.margin * 100).toFixed(0)}%</span>
        <span>{totals.count} item</span>
      </div>
      {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
    </div>
  );
}

export function DashboardCharts({
  kpis,
  trend,
  payments,
  top,
  empty,
}: {
  kpis: { today: Totals; last7: Totals; last30: Totals; all: Totals };
  trend: DailyPoint[];
  payments: PaymentSlice[];
  top: TopProduct[];
  empty: boolean;
}) {
  if (empty) {
    return (
      <div className="rounded-md border border-dashed border-hairline p-10 text-center">
        <p className="text-sm text-muted">
          Belum ada laporan penjualan. Kirim laporan via Telegram bot, lalu
          konfirmasi untuk muncul di sini.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      {/* KPI cards */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <KpiCard label="Hari Ini" totals={kpis.today} />
        <KpiCard label="7 Hari" totals={kpis.last7} />
        <KpiCard label="30 Hari" totals={kpis.last30} />
        <KpiCard label="All Time" totals={kpis.all} />
      </section>

      {/* Daily trend */}
      <section className="rounded-md border border-hairline bg-background p-4">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider">
            Tren 30 Hari
          </h2>
          <span className="text-xs text-muted">Revenue per hari</span>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={trend}
              margin={{ top: 6, right: 6, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#ececec" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: MUTED }}
                tickFormatter={(d: string) => d.slice(5)}
              />
              <YAxis
                tick={{ fontSize: 10, fill: MUTED }}
                tickFormatter={(v: number) => formatIDRCompact(v)}
                width={70}
              />
              <Tooltip
                contentStyle={{
                  background: FG,
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  fontSize: 12,
                }}
                cursor={{ fill: CREAM }}
                formatter={(value, key) => [
                  formatIDR(Number(value) || 0),
                  String(key) === "revenue" ? "Revenue" : "Profit",
                ]}
              />
              <Bar dataKey="revenue" fill={FG} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
        {/* Payment breakdown */}
        <div className="rounded-md border border-hairline bg-background p-4">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider">
              Metode Pembayaran
            </h2>
            <span className="text-xs text-muted">30 hari terakhir</span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={payments}
                    dataKey="revenue"
                    nameKey="method"
                    innerRadius={36}
                    outerRadius={70}
                    paddingAngle={2}
                  >
                    {payments.map((p) => (
                      <Cell key={p.method} fill={colorFor(p.method)} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: FG,
                      color: "#fff",
                      border: "none",
                      borderRadius: 6,
                      fontSize: 12,
                    }}
                    formatter={(value) => formatIDR(Number(value) || 0)}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="flex flex-col gap-2 text-sm">
              {payments.map((p) => (
                <li
                  key={p.method}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-sm"
                      style={{ background: colorFor(p.method) }}
                    />
                    {p.method}
                  </span>
                  <span className="text-right">
                    <span className="font-medium">{formatIDR(p.revenue)}</span>
                    <span className="ml-2 text-xs text-muted">
                      {p.count}x
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Top products */}
        <div className="rounded-md border border-hairline bg-background p-4">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider">
              Produk Terlaris
            </h2>
            <span className="text-xs text-muted">30 hari · top 10</span>
          </div>
          <ol className="flex flex-col gap-2 text-sm">
            {top.map((p, i) => (
              <li
                key={p.productName}
                className="flex items-center justify-between gap-3"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="text-xs font-mono text-muted">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="truncate">{p.productName}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="font-medium">{p.units}x</span>
                  <span className="ml-2 text-xs text-muted">
                    {formatIDR(p.revenue)}
                  </span>
                </span>
              </li>
            ))}
            {top.length === 0 && (
              <li className="text-xs text-muted">Belum ada penjualan.</li>
            )}
          </ol>
        </div>
      </section>
    </div>
  );
}
