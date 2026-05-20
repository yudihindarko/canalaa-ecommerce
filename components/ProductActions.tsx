"use client";

import { useState } from "react";
import { motion } from "motion/react";
import type { Product, Size } from "@/lib/types";
import { buildWhatsAppUrl, formatIDR } from "@/lib/whatsapp";

export function ProductActions({ product }: { product: Product }) {
  const firstAvailable = product.sizes.find((s) => s.inStock) ?? null;
  const [selected, setSelected] = useState<Size | null>(firstAvailable);

  const waUrl = selected ? buildWhatsAppUrl(product, selected) : "#";
  const disabled = !selected;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted">
          CANALAA
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">
          {product.name}
        </h1>
        <p className="mt-2 text-xl font-semibold">{formatIDR(product.price)}</p>
      </div>

      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">
            Ukuran
          </p>
          <button
            type="button"
            className="text-xs underline-offset-4 hover:underline"
            aria-label="Open size guide"
          >
            Panduan ukuran
          </button>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {product.sizes.map((size) => {
            const isSelected = selected?.eu === size.eu;
            const oos = !size.inStock;
            return (
              <button
                key={size.eu}
                type="button"
                disabled={oos}
                onClick={() => setSelected(size)}
                aria-pressed={isSelected}
                className={`flex flex-col items-center rounded border py-2 text-sm transition-colors ${
                  oos
                    ? "cursor-not-allowed border-hairline text-muted line-through opacity-50"
                    : isSelected
                      ? "border-foreground bg-foreground text-background"
                      : "border-hairline hover:border-foreground"
                }`}
              >
                <span className="font-medium">EU {size.eu}</span>
                <span className="text-[10px] opacity-70">{size.cm} cm</span>
              </button>
            );
          })}
        </div>
      </div>

      <motion.a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        whileTap={{ scale: 0.98 }}
        aria-disabled={disabled}
        className={`inline-flex items-center justify-center gap-2 rounded-full py-4 text-sm font-semibold transition-opacity ${
          disabled
            ? "pointer-events-none bg-muted text-background opacity-50"
            : "bg-foreground text-background hover:opacity-90"
        }`}
      >
        <span aria-hidden>💬</span>
        ORDER VIA WHATSAPP
      </motion.a>

    </div>
  );
}
