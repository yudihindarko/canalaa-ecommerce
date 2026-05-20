import type { Product } from "./types";
import { seedProducts } from "./seed-products";

type AnyPayload = {
  find: (args: {
    collection: string;
    where?: Record<string, unknown>;
    limit?: number;
  }) => Promise<{ docs: unknown[] }>;
};

let cachedPayload: AnyPayload | null = null;

async function getPayloadClient(): Promise<AnyPayload | null> {
  if (cachedPayload) return cachedPayload;
  try {
    const { getPayload } = await import("payload");
    const { default: config } = await import("@payload-config");
    cachedPayload = (await getPayload({ config })) as unknown as AnyPayload;
    return cachedPayload;
  } catch (e) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[products] Payload unavailable, using seed data", e);
    }
    return null;
  }
}

type RawProduct = {
  slug?: string;
  name?: string;
  price?: number;
  images?: Array<{ image?: { url?: string } | string }>;
  sizes?: Array<{ eu?: number; cm?: number; inStock?: boolean }>;
  featured?: boolean;
};

function normalize(p: RawProduct): Product {
  return {
    slug: p.slug ?? "",
    name: p.name ?? "",
    price: p.price ?? 0,
    images: (p.images ?? [])
      .map((i) =>
        typeof i.image === "object" && i.image?.url ? i.image.url : null,
      )
      .filter((u): u is string => !!u),
    sizes: (p.sizes ?? []).map((s) => ({
      eu: s.eu ?? 0,
      cm: s.cm ?? 0,
      inStock: s.inStock !== false,
    })),
    featured: !!p.featured,
  };
}

export async function getAllProducts(): Promise<Product[]> {
  const payload = await getPayloadClient();
  if (!payload) return seedProducts;
  try {
    const result = await payload.find({ collection: "products", limit: 100 });
    if (result.docs.length === 0) return seedProducts;
    return (result.docs as RawProduct[]).map(normalize);
  } catch {
    return seedProducts;
  }
}

export async function getProductBySlug(
  slug: string,
): Promise<Product | undefined> {
  const payload = await getPayloadClient();
  if (!payload) return seedProducts.find((p) => p.slug === slug);
  try {
    const result = await payload.find({
      collection: "products",
      where: { slug: { equals: slug } },
      limit: 1,
    });
    if (result.docs.length === 0) {
      return seedProducts.find((p) => p.slug === slug);
    }
    return normalize(result.docs[0] as RawProduct);
  } catch {
    return seedProducts.find((p) => p.slug === slug);
  }
}

export async function getFeaturedProducts(): Promise<Product[]> {
  const payload = await getPayloadClient();
  if (!payload) return seedProducts.filter((p) => p.featured);
  try {
    const result = await payload.find({
      collection: "products",
      where: { featured: { equals: true } },
      limit: 8,
    });
    if (result.docs.length === 0) {
      return seedProducts.filter((p) => p.featured);
    }
    return (result.docs as RawProduct[]).map(normalize);
  } catch {
    return seedProducts.filter((p) => p.featured);
  }
}

export async function getAllSlugs(): Promise<string[]> {
  const all = await getAllProducts();
  return all.map((p) => p.slug);
}
