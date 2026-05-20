import type { CollectionConfig } from "payload";
import { revalidatePath } from "next/cache";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function randomPriceIDR(): number {
  const minK = 450;
  const maxK = 530;
  const stepK = 5;
  const steps = Math.floor((maxK - minK) / stepK) + 1;
  return (minK + Math.floor(Math.random() * steps) * stepK) * 1000;
}

function revalidateStorefront(slug?: string | null) {
  try {
    revalidatePath("/");
    revalidatePath("/products");
    if (slug) revalidatePath(`/products/${slug}`);
  } catch (e) {
    // revalidatePath throws outside Next.js context (e.g. local CLI scripts).
    // Safe to swallow — Payload from Next.js runtime always has it available.
    if (process.env.NODE_ENV !== "production") {
      console.warn("[products] revalidate skipped:", e);
    }
  }
}

export const Products: CollectionConfig = {
  slug: "products",
  access: {
    read: () => true,
  },
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "price", "featured"],
  },
  hooks: {
    afterChange: [
      ({ doc, operation }) => {
        if (operation === "create" || operation === "update") {
          revalidateStorefront(doc?.slug);
        }
      },
    ],
    afterDelete: [
      ({ doc }) => {
        revalidateStorefront(doc?.slug);
      },
    ],
  },
  fields: [
    {
      name: "name",
      type: "text",
      required: true,
    },
    {
      name: "slug",
      type: "text",
      required: true,
      unique: true,
      index: true,
      admin: {
        description:
          "Auto-generated from name (SEO friendly). You can override if needed.",
        position: "sidebar",
      },
      hooks: {
        beforeValidate: [
          ({ value, data }) => {
            if (typeof value === "string" && value.trim().length > 0) {
              return slugify(value);
            }
            if (typeof data?.name === "string" && data.name.length > 0) {
              return slugify(data.name);
            }
            return value;
          },
        ],
      },
    },
    {
      name: "price",
      type: "number",
      required: true,
      min: 0,
      defaultValue: randomPriceIDR,
      admin: {
        description:
          "Harga dalam IDR. Default disarankan acak antara Rp 450.000 – Rp 530.000.",
      },
    },
    {
      name: "images",
      type: "array",
      minRows: 1,
      label: "Foto produk",
      labels: {
        singular: "Foto",
        plural: "Foto",
      },
      fields: [
        {
          name: "image",
          type: "upload",
          relationTo: "media",
          required: true,
        },
      ],
    },
    {
      name: "sizes",
      type: "array",
      minRows: 1,
      label: "Ukuran tersedia",
      labels: {
        singular: "Ukuran",
        plural: "Ukuran",
      },
      fields: [
        {
          type: "row",
          fields: [
            {
              name: "eu",
              type: "number",
              required: true,
              label: "EU",
              admin: { width: "33%" },
            },
            {
              name: "cm",
              type: "number",
              required: true,
              label: "CM",
              admin: { width: "33%" },
            },
            {
              name: "inStock",
              type: "checkbox",
              defaultValue: true,
              label: "Tersedia",
              admin: { width: "33%" },
            },
          ],
        },
      ],
    },
    {
      name: "featured",
      type: "checkbox",
      defaultValue: false,
      admin: {
        description: "Tampilkan di homepage New Drops",
        position: "sidebar",
      },
    },
  ],
};
