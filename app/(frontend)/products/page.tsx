import { ProductCard } from "@/components/ProductCard";
import { getAllProducts } from "@/lib/products";

export const metadata = {
  title: "Koleksi — CANALAA",
  description: "Semua sepatu CANALAA. Less hype, more walk.",
};

export default async function CatalogPage() {
  const products = await getAllProducts();

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 md:px-8 md:py-14">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            KOLEKSI
          </h1>
          <p className="mt-1 text-sm text-muted">
            {products.length} items · Less hype. More walk.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.slug} product={product} />
        ))}
      </div>
    </section>
  );
}
