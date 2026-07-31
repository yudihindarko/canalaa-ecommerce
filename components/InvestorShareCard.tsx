"use client";

import {
  PROFIT_SHARE_POOL_RATE,
  computeInvestorPayout,
  computeSharePool,
  formatSharePercent,
  type InvestorShare,
} from "@/lib/investor-shares";
import { formatIDR } from "@/lib/sales-aggregate";

export function InvestorShareCard({
  netProfit,
  periodLabel,
  investors,
}: {
  netProfit: number;
  periodLabel: string;
  investors: InvestorShare[];
}) {
  const pool = computeSharePool(netProfit);
  const totalShareRate = investors.reduce((s, i) => s + i.rate, 0);
  const totalShareAmount = pool * totalShareRate;
  const remainder = pool - totalShareAmount;
  const overAllocated = totalShareRate > 1;
  const poolPct = formatSharePercent(PROFIT_SHARE_POOL_RATE);

  return (
    <section className="rounded-md border border-hairline bg-background p-4 md:p-6">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider">
          Bagi Hasil Investor
        </h2>
        <div className="flex items-center gap-3 text-xs text-muted">
          <span>{periodLabel}</span>
          <a
            href="/admin/collections/investors"
            className="font-medium text-foreground underline-offset-2 hover:underline"
          >
            Kelola
          </a>
        </div>
      </div>

      <p className="mb-4 text-sm text-muted">
        Rumus: (keuntungan bersih × {poolPct}%) × % investor
        {netProfit < 0 ? " — periode rugi, bagi hasil Rp 0" : ""}.
      </p>

      {investors.length === 0 ? (
        <p className="py-4 text-sm text-muted">
          Belum ada investor. Tambah di{" "}
          <a
            href="/admin/collections/investors"
            className="font-medium text-foreground underline-offset-2 hover:underline"
          >
            Admin → Bagi Hasil Investor
          </a>
          .
        </p>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-hairline px-3 py-3">
              <p className="text-xs font-medium uppercase tracking-wider text-muted">
                Keuntungan bersih
              </p>
              <p
                className={`mt-1 text-xl font-bold tabular-nums ${
                  netProfit < 0 ? "text-red-700" : ""
                }`}
              >
                {formatIDR(netProfit)}
              </p>
            </div>
            <div className="rounded-md border border-hairline px-3 py-3">
              <p className="text-xs font-medium uppercase tracking-wider text-muted">
                Basis bagi hasil ({poolPct}%)
              </p>
              <p className="mt-1 text-xl font-bold tabular-nums">
                {formatIDR(pool)}
              </p>
              <p className="mt-1 text-xs text-muted">
                Keuntungan bersih × {poolPct}%
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {investors.map((inv) => {
              const amount = computeInvestorPayout(netProfit, inv.rate);
              return (
                <div
                  key={inv.id}
                  className="rounded-md border border-hairline px-3 py-3"
                >
                  <p className="text-xs font-medium uppercase tracking-wider text-muted">
                    {inv.name}
                  </p>
                  <p className="mt-1 text-lg font-bold tabular-nums">
                    {formatIDR(amount)}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    (bersih × {poolPct}%) × {formatSharePercent(inv.rate)}%
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 border-t border-hairline pt-3 text-xs text-muted">
            <span>
              Total investor ({formatSharePercent(totalShareRate)}% dari basis):{" "}
              <span className="font-medium text-foreground tabular-nums">
                {formatIDR(totalShareAmount)}
              </span>
            </span>
            {!overAllocated && (
              <span>
                Sisa basis ({formatSharePercent(1 - totalShareRate)}%):{" "}
                <span className="font-medium text-foreground tabular-nums">
                  {formatIDR(remainder)}
                </span>
              </span>
            )}
            {overAllocated && (
              <span className="text-amber-800">
                Total persentase melebihi 100%. Periksa data di admin.
              </span>
            )}
          </div>
        </>
      )}
    </section>
  );
}
