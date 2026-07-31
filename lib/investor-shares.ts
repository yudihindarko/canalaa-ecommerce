export type InvestorShare = {
  id: string;
  name: string;
  /** Fraction 0..1 (e.g. 0.26 for 26%) */
  rate: number;
};

/**
 * Pool bagi hasil: 30% dari keuntungan bersih.
 * Payout investor = (keuntungan bersih × 30%) × % investor.
 */
export const PROFIT_SHARE_POOL_RATE = 0.3;

/** Convert admin percent (0–100) to rate (0–1). */
export function percentToRate(sharePercent: number): number {
  return (Number(sharePercent) || 0) / 100;
}

/** Format rate 0.26 → "26" or 0.265 → "26,5" */
export function formatSharePercent(rate: number): string {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 2,
  }).format(rate * 100);
}

/** Basis bagi hasil = max(0, bersih) × 30%. */
export function computeSharePool(netProfit: number): number {
  return Math.max(0, netProfit) * PROFIT_SHARE_POOL_RATE;
}

/** (keuntungan bersih × 30%) × rate investor. */
export function computeInvestorPayout(
  netProfit: number,
  investorRate: number,
): number {
  return computeSharePool(netProfit) * investorRate;
}
