import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductGallery } from "@/components/ProductGallery";
import { ProductActions } from "@/components/ProductActions";
import { getAllSlugs, getProductBySlug } from "@/lib/products";

export async function generateStaticParams() {
  const slugs = await getAllSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Tidak ditemukan — CANALAA" };
  return {
    title: `${product.name} — CANALAA`,
    description: `${product.name} — Rp ${product.price.toLocaleString("id-ID")}. Order via WhatsApp.`,
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  return (
    <article className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
      <Link
        href="/products"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
      >
        ← Kembali ke koleksi
      </Link>

      <div className="grid gap-8 md:grid-cols-2 md:gap-12">
        <ProductGallery images={product.images} alt={product.name} />
        <ProductActions product={product} />
      </div>
    </article>
  );
}
