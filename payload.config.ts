import { postgresAdapter } from "@payloadcms/db-postgres";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import { s3Storage } from "@payloadcms/storage-s3";
import path from "path";
import { buildConfig } from "payload";
import { fileURLToPath } from "url";
import sharp from "sharp";

import { Users } from "./collections/Users";
import { Media } from "./collections/Media";
import { Products } from "./collections/Products";
import { Sales } from "./collections/Sales";
import { Expenses } from "./collections/Expenses";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export default buildConfig({
  admin: {
    user: Users.slug,
    meta: {
      title: "CANALAA Admin",
      description: "Manage CANALAA products and media",
    },
    components: {
      afterNavLinks: [
        "@/components/admin/DashboardNavLink#DashboardNavLink",
      ],
    },
  },
  collections: [Users, Media, Products, Sales, Expenses],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || "",
  typescript: {
    outputFile: path.resolve(dirname, "payload-types.ts"),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI || "",
    },
    // TEMPORARY: enabled so the new "expenses" + "sales.category" schema
    // auto-syncs on first deploy. Revert to false in the very next commit
    // once the table/columns are verified in Neon.
    push: true,
  }),
  sharp,
  plugins: [
    s3Storage({
      collections: {
        media: {
          disablePayloadAccessControl: true,
          generateFileURL: ({ filename, prefix }) => {
            const base = (process.env.R2_PUBLIC_URL || "").replace(/\/$/, "");
            const path = prefix ? `${prefix}/${filename}` : filename;
            return `${base}/${path}`;
          },
        },
      },
      bucket: process.env.R2_BUCKET || "",
      config: {
        endpoint: process.env.R2_ENDPOINT,
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
        },
        region: "auto",
      },
    }),
  ],
});
