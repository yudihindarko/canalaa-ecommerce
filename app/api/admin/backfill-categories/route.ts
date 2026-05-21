import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getPayload } from "payload";
import config from "@payload-config";
import { detectCategory } from "@/lib/category-detector";

export const dynamic = "force-dynamic";

/**
 * One-shot backfill: assigns category to any sale that's missing one,
 * using the same keyword detector that runs on new sales.
 *
 * Auth: requires a valid Payload admin session cookie. Form on the
 * dashboard POSTs here; we redirect back to /dashboard after.
 */
export async function POST() {
  const payload = await getPayload({ config });
  const headersList = await headers();
  const { user } = await payload.auth({ headers: headersList });
  if (!user) return new Response("Unauthorized", { status: 401 });

  const result = await payload.find({
    collection: "sales",
    where: {
      or: [
        { category: { exists: false } },
        { category: { equals: null } },
      ],
    },
    limit: 5000,
  });

  let updated = 0;
  for (const doc of result.docs as Array<Record<string, unknown>>) {
    const productName = String(doc.productName ?? "");
    const cat = detectCategory(productName);
    try {
      await payload.update({
        collection: "sales",
        id: doc.id as string | number,
        data: { category: cat },
      });
      updated++;
    } catch (err) {
      console.error("[backfill] failed for sale", doc.id, err);
    }
  }

  return redirect(`/dashboard?backfilled=${updated}`);
}
