import { after } from "next/server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { getPayload } from "payload";
import config from "@payload-config";
import {
  generateAltTextForImage,
  generateMarketingVariants,
} from "@/lib/ai-marketing";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type MediaDoc = {
  id: string | number;
  url?: string;
  filename?: string;
  mimeType?: string;
  alt?: string;
};

type ProductImageRow = {
  id?: string;
  image: MediaDoc | string | number;
};

type Auth =
  | { ok: true; via: "secret" | "session" }
  | { ok: false; reason: string };

async function checkAuth(req: Request): Promise<Auth> {
  // Internal calls (from bot) use shared secret
  const internalSecret = req.headers.get("x-internal-secret");
  if (
    internalSecret &&
    process.env.AI_GENERATION_SECRET &&
    internalSecret === process.env.AI_GENERATION_SECRET
  ) {
    return { ok: true, via: "secret" };
  }

  // Admin manual triggers use Payload session cookie
  try {
    const payload = await getPayload({ config });
    const headersList = await headers();
    const { user } = await payload.auth({ headers: headersList });
    if (user) return { ok: true, via: "session" };
  } catch {
    // fall through
  }
  return { ok: false, reason: "unauthorized" };
}

export async function POST(req: Request) {
  const auth = await checkAuth(req);
  if (!auth.ok) {
    return new Response(auth.reason, { status: 401 });
  }

  let body: { productId?: string | number };
  try {
    body = await req.json();
  } catch {
    return new Response("invalid json", { status: 400 });
  }

  if (!body.productId) {
    return new Response("missing productId", { status: 400 });
  }

  const productId = body.productId;

  // Schedule the heavy work AFTER returning to caller, so bot doesn't wait
  after(async () => {
    try {
      await runGenerationFor(productId);
    } catch (err) {
      console.error("[ai-marketing] background error:", err);
    }
  });

  return Response.json({ ok: true, status: "scheduled", productId });
}

async function runGenerationFor(productId: string | number) {
  const payload = await getPayload({ config });

  const product = (await payload.findByID({
    collection: "products",
    id: productId,
    depth: 2,
  })) as unknown as {
    id: string | number;
    name: string;
    slug: string;
    images?: ProductImageRow[];
  };

  if (!product) {
    console.warn("[ai-marketing] product not found:", productId);
    return;
  }

  const images = product.images ?? [];
  const firstImage = images[0]?.image;
  if (!firstImage || typeof firstImage === "string" || typeof firstImage === "number") {
    console.warn("[ai-marketing] no image to use as reference for", productId);
    return;
  }
  const refMedia = firstImage as MediaDoc;
  if (!refMedia.url) {
    console.warn("[ai-marketing] reference image has no url");
    return;
  }

  // Download original from R2
  const refRes = await fetch(refMedia.url);
  if (!refRes.ok) {
    console.warn("[ai-marketing] failed to fetch reference image:", refRes.status);
    return;
  }
  const refBuffer = Buffer.from(await refRes.arrayBuffer());
  const refMimeType = refMedia.mimeType ?? "image/jpeg";

  // 1. Generate variants in parallel
  const variants = await generateMarketingVariants(
    refBuffer,
    refMimeType,
    product.name,
  );

  if (variants.length === 0) {
    console.warn("[ai-marketing] no variants generated for", productId);
  }

  // 2. Upload each variant to Media collection
  const newMediaIds: Array<string | number> = [];
  for (const v of variants) {
    try {
      const mediaDoc = await payload.create({
        collection: "media",
        data: { alt: v.alt },
        file: {
          data: v.buffer,
          mimetype: v.mimeType,
          name: `${product.slug}-${v.variant}-${Date.now()}.png`,
          size: v.buffer.length,
        },
      });
      newMediaIds.push(mediaDoc.id as string | number);
    } catch (err) {
      console.error("[ai-marketing] media upload failed:", err);
    }
  }

  // 3. Backfill alt text for original photos that look auto-generated
  for (const row of images) {
    const img = row.image;
    if (!img || typeof img === "string" || typeof img === "number") continue;
    const media = img as MediaDoc;
    const altLooksGeneric =
      !media.alt ||
      media.alt.includes("file_") ||
      (media.filename ? media.alt.includes(media.filename) : false);
    if (!altLooksGeneric) continue;
    if (!media.url) continue;
    try {
      const imgRes = await fetch(media.url);
      if (!imgRes.ok) continue;
      const buf = Buffer.from(await imgRes.arrayBuffer());
      const newAlt = await generateAltTextForImage(
        buf,
        media.mimeType ?? "image/jpeg",
        product.name,
      );
      if (newAlt) {
        await payload.update({
          collection: "media",
          id: media.id,
          data: { alt: newAlt },
        });
      }
    } catch (err) {
      console.warn("[ai-marketing] alt gen failed for media", media.id, err);
    }
  }

  // 4. Attach new variants to product.images
  if (newMediaIds.length > 0) {
    const existingRefs = images
      .map((row) => {
        const img = row.image;
        if (typeof img === "string" || typeof img === "number") return img;
        return (img as MediaDoc).id;
      })
      .filter((id): id is string | number => id !== undefined);

    await payload.update({
      collection: "products",
      id: productId,
      data: {
        images: [
          ...existingRefs.map((id) => ({ image: id })),
          ...newMediaIds.map((id) => ({ image: id })),
        ],
      },
    });
  }

  // 5. Revalidate storefront so the new images show up
  try {
    revalidatePath(`/products/${product.slug}`);
    revalidatePath("/products");
    revalidatePath("/");
  } catch (err) {
    console.warn("[ai-marketing] revalidate failed:", err);
  }

  console.log(
    `[ai-marketing] done productId=${productId} variants=${newMediaIds.length}`,
  );
}
