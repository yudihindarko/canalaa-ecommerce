import type { CollectionConfig } from "payload";
import { revalidatePath } from "next/cache";

function revalidateDashboard() {
  try {
    revalidatePath("/dashboard");
  } catch {
    // Outside Next.js context — safe to ignore
  }
}

export const Investors: CollectionConfig = {
  slug: "investors",
  labels: {
    singular: "Investor",
    plural: "Bagi Hasil Investor",
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "sharePercent", "active", "updatedAt"],
    description:
      "Kelola nama investor dan % bagi hasil. Rumus: (keuntungan bersih × 30%) × % investor.",
  },
  hooks: {
    afterChange: [() => revalidateDashboard()],
    afterDelete: [() => revalidateDashboard()],
  },
  fields: [
    {
      name: "name",
      type: "text",
      required: true,
      admin: {
        description: "Nama investor",
      },
    },
    {
      name: "sharePercent",
      type: "number",
      required: true,
      min: 0,
      max: 100,
      admin: {
        description:
          "Persentase dari basis 30% keuntungan bersih (contoh: 26 → (bersih × 30%) × 26%)",
        step: 0.01,
      },
    },
    {
      name: "active",
      type: "checkbox",
      defaultValue: true,
      admin: {
        position: "sidebar",
        description: "Nonaktifkan untuk menyembunyikan dari dashboard tanpa menghapus.",
      },
    },
    {
      name: "sortOrder",
      type: "number",
      defaultValue: 0,
      admin: {
        position: "sidebar",
        description: "Urutan tampil (angka kecil lebih dulu)",
      },
    },
  ],
};
