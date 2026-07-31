import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import {
  PROFIT_SHARE_POOL_RATE,
  computeInvestorPayout,
  computeSharePool,
  formatSharePercent,
  type InvestorShare,
} from "@/lib/investor-shares";
import {
  formatIDR,
  type DailyPoint,
  type MonthlyPnL,
  type PaymentSlice,
  type TopProduct,
  type Totals,
} from "@/lib/sales-aggregate";

export type DashboardPdfInput = {
  periodKey: string;
  periodLabel: string;
  periodTotals: Totals;
  payments: PaymentSlice[];
  top: TopProduct[];
  trend: DailyPoint[];
  pnl: MonthlyPnL;
  investors: InvestorShare[];
};

function money(n: number): string {
  return formatIDR(n);
}

function tableEndY(doc: jsPDF): number {
  const last = (doc as jsPDF & { lastAutoTable?: { finalY?: number } })
    .lastAutoTable;
  return last?.finalY ?? 0;
}

export function exportDashboardPdf(input: DashboardPdfInput): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 14;
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = margin;

  const ensureSpace = (needed: number) => {
    const pageHeight = doc.internal.pageSize.getHeight();
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("CANALAA — Laporan Dashboard", margin, y);
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(input.periodLabel, margin, y);
  y += 5;
  doc.text(
    `Diekspor ${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB`,
    margin,
    y,
  );
  doc.setTextColor(0);
  y += 10;

  // KPI periode
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Ringkasan Periode", margin, y);
  y += 2;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Metrik", "Nilai"]],
    body: [
      ["Revenue", money(input.periodTotals.revenue)],
      ["Profit (sales − COGS)", money(input.periodTotals.profit)],
      ["Margin", `${(input.periodTotals.margin * 100).toFixed(1)}%`],
      ["Jumlah item", String(input.periodTotals.count)],
    ],
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [10, 10, 10], textColor: 255 },
    columnStyles: { 1: { halign: "right" } },
  });
  y = tableEndY(doc) + 8;

  // Payments
  ensureSpace(30);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Metode Pembayaran", margin, y);
  y += 2;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Metode", "Revenue", "Transaksi"]],
    body:
      input.payments.length > 0
        ? input.payments.map((p) => [
            p.method,
            money(p.revenue),
            String(p.count),
          ])
        : [["—", "—", "—"]],
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [10, 10, 10], textColor: 255 },
    columnStyles: {
      1: { halign: "right" },
      2: { halign: "right" },
    },
  });
  y = tableEndY(doc) + 8;

  // Top products
  ensureSpace(30);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Produk Terlaris (Top 10)", margin, y);
  y += 2;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["#", "Produk", "Unit", "Revenue"]],
    body:
      input.top.length > 0
        ? input.top.map((p, i) => [
            String(i + 1),
            p.productName,
            String(p.units),
            money(p.revenue),
          ])
        : [["—", "Belum ada penjualan", "—", "—"]],
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [10, 10, 10], textColor: 255 },
    columnStyles: {
      0: { cellWidth: 10 },
      2: { halign: "right" },
      3: { halign: "right" },
    },
  });
  y = tableEndY(doc) + 8;

  // Daily trend (compact)
  ensureSpace(30);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Tren Harian", margin, y);
  y += 2;

  const trendBody = input.trend
    .filter((d) => d.count > 0 || d.revenue > 0)
    .map((d) => [
      d.date,
      money(d.revenue),
      money(d.profit),
      String(d.count),
    ]);

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Tanggal", "Revenue", "Profit", "Item"]],
    body: trendBody.length > 0 ? trendBody : [["—", "—", "—", "—"]],
    styles: { fontSize: 8, cellPadding: 1.5 },
    headStyles: { fillColor: [10, 10, 10], textColor: 255 },
    columnStyles: {
      1: { halign: "right" },
      2: { halign: "right" },
      3: { halign: "right" },
    },
  });
  y = tableEndY(doc) + 8;

  // P&L
  ensureSpace(40);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Laporan Bulanan (P&L)", margin, y);
  y += 2;

  const pnlRows: string[][] = [];
  pnlRows.push(["BIAYA TETAP", ""]);
  if (input.pnl.fixed.length === 0) {
    pnlRows.push(["  (kosong)", money(0)]);
  } else {
    for (const e of input.pnl.fixed) {
      pnlRows.push([`  ${e.category}`, money(e.amount)]);
    }
  }
  pnlRows.push(["Subtotal Tetap", money(input.pnl.fixedTotal)]);
  pnlRows.push(["BIAYA VARIABLE", ""]);
  for (const c of input.pnl.cogsByCategory) {
    pnlRows.push([
      `  COGS — ${c.category} (${c.units}x)`,
      money(c.cogs),
    ]);
  }
  for (const e of input.pnl.variableOps) {
    pnlRows.push([`  ${e.category}`, money(e.amount)]);
  }
  pnlRows.push(["Subtotal Variable", money(input.pnl.variableTotal)]);
  pnlRows.push(["TOTAL BIAYA", money(input.pnl.totalCosts)]);
  pnlRows.push(["SALES", ""]);
  if (input.pnl.salesByCategory.length === 0) {
    pnlRows.push(["  (kosong)", money(0)]);
  } else {
    for (const c of input.pnl.salesByCategory) {
      pnlRows.push([
        `  ${c.category} (${c.units}x)`,
        money(c.revenue),
      ]);
    }
  }
  pnlRows.push(["Total Sales", money(input.pnl.salesTotal)]);
  pnlRows.push(["Keuntungan bersih", money(input.pnl.profit)]);
  if (input.pnl.salesTotal > 0) {
    pnlRows.push([
      "Margin",
      `${((input.pnl.profit / input.pnl.salesTotal) * 100).toFixed(1)}%`,
    ]);
  }

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Akun", "Jumlah"]],
    body: pnlRows,
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [10, 10, 10], textColor: 255 },
    columnStyles: { 1: { halign: "right" } },
    didParseCell: (data) => {
      const raw = data.row.raw;
      const label = Array.isArray(raw) ? String(raw[0] ?? "") : "";
      const boldLabels = new Set([
        "BIAYA TETAP",
        "BIAYA VARIABLE",
        "SALES",
        "Subtotal Tetap",
        "Subtotal Variable",
        "TOTAL BIAYA",
        "Total Sales",
        "Keuntungan bersih",
      ]);
      if (data.section === "body" && boldLabels.has(label)) {
        data.cell.styles.fontStyle = "bold";
      }
    },
  });
  y = tableEndY(doc) + 8;

  // Investor profit share: (net profit * 30%) * investor%
  ensureSpace(50);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Bagi Hasil Investor", margin, y);
  y += 5;

  const poolPct = formatSharePercent(PROFIT_SHARE_POOL_RATE);
  const pool = computeSharePool(input.pnl.profit);
  const investors = input.investors ?? [];

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80);
  doc.text(
    `Rumus: (Keuntungan bersih * ${poolPct}%) * % investor` +
      (input.pnl.profit < 0 ? " | Periode rugi: bagi hasil Rp 0" : ""),
    margin,
    y,
    { maxWidth: pageWidth - margin * 2 },
  );
  doc.setTextColor(0);
  y += 6;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Keterangan", "Jumlah"]],
    body: [
      ["1. Keuntungan bersih", money(input.pnl.profit)],
      [`2. Bagi hasil ${poolPct}%`, money(pool)],
      ...(investors.length > 0
        ? investors.map((inv, idx) => [
            `3.${idx + 1} ${inv.name} ${formatSharePercent(inv.rate)}%`,
            money(computeInvestorPayout(input.pnl.profit, inv.rate)),
          ])
        : [["3. Investor (belum ada di admin)", "—"]]),
    ],
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [10, 10, 10], textColor: 255 },
    columnStyles: {
      1: { halign: "right" },
    },
    didParseCell: (data) => {
      const raw = data.row.raw;
      const label = Array.isArray(raw) ? String(raw[0] ?? "") : "";
      if (
        data.section === "body" &&
        (label.startsWith("1.") || label.startsWith("2."))
      ) {
        data.cell.styles.fontStyle = "bold";
      }
    },
  });

  // Footer page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(
      `Halaman ${i} / ${pageCount}`,
      pageWidth - margin,
      doc.internal.pageSize.getHeight() - 8,
      { align: "right" },
    );
  }

  doc.save(`canalaa-dashboard-${input.periodKey}.pdf`);
}
