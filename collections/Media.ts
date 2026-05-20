import type { CollectionConfig } from "payload";

export const Media: CollectionConfig = {
  slug: "media",
  admin: {
    useAsTitle: "alt",
  },
  upload: true,
  fields: [
    {
      name: "alt",
      type: "text",
      required: true,
      admin: {
        description: "Deskripsi gambar untuk SEO + accessibility",
      },
    },
  ],
};
