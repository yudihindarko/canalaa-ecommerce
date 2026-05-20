import Link from "next/link";
import Image from "next/image";
import type { Product } from "@/lib/types";
import { formatIDR } from "@/lib/whatsapp";

export function ProductCard({ product }: { product: Product }) {
  const allSoldOut = product.sizes.every((s) => !s.inStock);

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group block"
      aria-label={`${product.name} — ${formatIDR(product.price)}`}
    >
      <div className="relative aspect-square overflow-hidden rounded-md bg-cream">
        <Image
          src={product.images[0]}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 50vw, 25vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {allSoldOut && (
          <span className="absolute left-2 top-2 rounded bg-foreground px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-background">
            Sold Out
          </span>
        )}
      </div>
      <div className="mt-3">
        <h3 className="text-sm font-medium">{product.name}</h3>
        <p className="mt-0.5 text-sm text-muted">{formatIDR(product.price)}</p>
      </div>
    </Link>
  );
}
