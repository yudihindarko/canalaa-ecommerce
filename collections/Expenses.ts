import type { CollectionConfig } from "payload";
import { revalidatePath } from "next/cache";

function revalidateDashboard() {
  try {
    revalidatePath("/dashboard");
  } catch {
    // Outside Next.js context — safe to ignore
  }
}

export const EXPENSE_CATEGORIES = [
  // Fixed
  { value: "internet", label: "Internet", type: "fixed" },
  { value: "listrik", label: "Listrik", type: "fixed" },
  { value: "sewa-toko", label: "Sewa Toko", type: "fixed" },
  { value: "gaji-karyawan", label: "Gaji Karyawan", type: "fixed" },
  { value: "bonus-karyawan", label: "Bonus Karyawan", type: "fixed" },
  { value: "thr", label: "THR", type: "fixed" },
  { value: "konsumsi", label: "Konsumsi (Makan & Minum)", type: "fixed" },
  { value: "renovasi-modal", label: "Renovasi + Modal", type: "fixed" },
  // Variable
  { value: "plastik", label: "Packing - Plastik", type: "variable" },
  { value: "kardus", label: "Packing - Kardus", type: "variable" },
  { value: "kaos-kaki", label: "Packing - Kaos Kaki", type: "variable" },
  { value: "maintenance", label: "Maintenance Toko", type: "variable" },
  { value: "ads-ig", label: "Ads Instagram", type: "variable" },
  { value: "shoes-care", label: "Shoes Care", type: "variable" },
  { value: "price-tag", label: "Price Tag", type: "variable" },
  { value: "other", label: "Other", type: "variable" },
];

export const Expenses: CollectionConfig = {
  slug: "expenses",
  access: {
    read: ({ req }) => Boolean(req.user),
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  admin: {
    useAsTitle: "category",
    defaultColumns: ["month", "type", "category", "amount", "notes"],
    listSearchableFields: ["notes"],
  },
  hooks: {
    afterChange: [() => revalidateDashboard()],
    afterDelete: [() => revalidateDashboard()],
  },
  fields: [
    {
      name: "month",
      type: "date",
      required: true,
      index: true,
      admin: {
        description: "Bulan dari biaya ini (gunakan tanggal 1)",
        date: {
          pickerAppearance: "monthOnly",
          displayFormat: "MMMM yyyy",
        },
      },
    },
    {
      name: "type",
      type: "select",
      required: true,
      index: true,
      options: [
        { label: "Biaya Tetap (Fixed)", value: "fixed" },
        { label: "Biaya Variable", value: "variable" },
      ],
      admin: {
        position: "sidebar",
      },
    },
    {
      name: "category",
      type: "select",
      required: true,
      options: EXPENSE_CATEGORIES.map((c) => ({
        label: c.label,
        value: c.value,
      })),
      admin: {
        description: "Pilih kategori biaya",
      },
    },
    {
      name: "amount",
      type: "number",
      required: true,
      min: 0,
      admin: {
        description: "Jumlah dalam IDR penuh (contoh: 1000000)",
      },
    },
    {
      name: "notes",
      type: "textarea",
      admin: {
        description: "Catatan tambahan (opsional)",
      },
    },
  ],
};
