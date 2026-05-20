import type { CollectionConfig } from "payload";

export const Products: CollectionConfig = {
  slug: "products",
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "price", "color", "featured"],
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
      admin: {
        description: "URL slug — lowercase, no spaces. Contoh: runner-black",
      },
    },
    {
      name: "price",
      type: "number",
      required: true,
      min: 0,
      admin: {
        description: "Harga dalam IDR (tanpa titik/koma). Contoh: 285000",
      },
    },
    {
      name: "color",
      type: "text",
      admin: {
        description: "Warna. Contoh: Black, Cream, Olive",
      },
    },
    {
      name: "description",
      type: "textarea",
      admin: {
        description: "Deskripsi produk (bisa multi-baris)",
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
      },
    },
  ],
};
