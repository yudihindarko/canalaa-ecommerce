import type { CollectionConfig } from "payload";
import { revalidatePath } from "next/cache";

function revalidateDashboard() {
  try {
    revalidatePath("/dashboard");
  } catch {
    // Outside Next.js context (e.g. CLI scripts) — safe to ignore
  }
}

export const Sales: CollectionConfig = {
  slug: "sales",
  access: {
    read: ({ req }) => Boolean(req.user),
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  admin: {
    useAsTitle: "productName",
    defaultColumns: [
      "reportDate",
      "productName",
      "amount",
      "cogs",
      "paymentMethod",
      "status",
    ],
    listSearchableFields: ["productName"],
  },
  hooks: {
    afterChange: [({ operation }) => operation === "create" || operation === "update" ? revalidateDashboard() : undefined],
    afterDelete: [() => revalidateDashboard()],
  },
  fields: [
    {
      name: "reportDate",
      type: "date",
      required: true,
      index: true,
      admin: {
        description: "Tanggal laporan (kapan transaksi terjadi)",
        date: { pickerAppearance: "dayOnly", displayFormat: "dd MMM yyyy" },
      },
    },
    {
      name: "itemNumber",
      type: "number",
      required: true,
      admin: {
        description: "Nomor urut item di laporan harian",
      },
    },
    {
      name: "productName",
      type: "text",
      required: true,
    },
    {
      name: "amount",
      type: "number",
      required: true,
      min: 0,
      admin: {
        description: "Harga jual (IDR penuh, contoh 400000)",
      },
    },
    {
      name: "cogs",
      type: "number",
      required: true,
      min: 0,
      label: "COGS (modal)",
      admin: {
        description: "Harga modal / cost of goods sold (IDR penuh)",
      },
    },
    {
      name: "paymentMethod",
      type: "select",
      required: true,
      options: [
        { label: "Transfer", value: "TF" },
        { label: "Cash", value: "CASH" },
        { label: "Shopee", value: "SHOPEE" },
        { label: "TikTok Shop", value: "TIKTOK" },
        { label: "QRIS", value: "QRIS" },
        { label: "Other", value: "OTHER" },
      ],
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "pending",
      options: [
        { label: "Pending konfirmasi", value: "pending" },
        { label: "Tersimpan", value: "confirmed" },
        { label: "Dibatalkan", value: "rejected" },
      ],
      admin: {
        position: "sidebar",
        description: "Hanya 'confirmed' yang dihitung di dashboard",
      },
    },
    {
      name: "rawLine",
      type: "text",
      admin: {
        description: "Baris asli dari laporan Telegram (debugging)",
        readOnly: true,
        position: "sidebar",
      },
    },
    {
      name: "reportedAt",
      type: "date",
      admin: {
        description: "Kapan bot menerima laporan ini",
        readOnly: true,
        position: "sidebar",
        date: { pickerAppearance: "dayAndTime" },
      },
    },
    {
      name: "reportedBy",
      type: "relationship",
      relationTo: "users",
      admin: {
        description: "Admin yang mengirim laporan",
        position: "sidebar",
      },
    },
  ],
};
