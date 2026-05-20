import Link from "next/link";
import { ManifestoHero } from "@/components/ManifestoHero";
import { ProductCard } from "@/components/ProductCard";
import { getFeaturedProducts } from "@/lib/products";

export default async function Home() {
  const featured = await getFeaturedProducts();

  return (
    <>
      <ManifestoHero />

      <section className="mx-auto max-w-6xl px-4 py-12 md:px-8 md:py-16">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-xl font-bold tracking-tight md:text-2xl">
            NEW DROPS
          </h2>
          <Link
            href="/products"
            className="text-sm font-medium underline-offset-4 hover:underline"
          >
            Lihat semua →
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
          {featured.map((product) => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </div>
      </section>

      {/* <section className="border-t border-hairline bg-cream">
        <div className="mx-auto max-w-6xl px-4 py-12 md:px-8 md:py-16">
          <p className="max-w-2xl text-2xl font-bold leading-tight tracking-tight md:text-4xl">
            Bukan yang pertama kamu lihat di feed.
            <br />
            <span className="text-muted">
              Yang paling sering kamu pakai di kaki.
            </span>
          </p>
        </div>
      </section> */}
    </>
  );
}
