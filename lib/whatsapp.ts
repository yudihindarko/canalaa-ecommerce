import type { Product, Size } from "./types";

export const WA_NUMBER = "6285155201153";

export function buildWhatsAppUrl(product: Product, size?: Size): string {
  const lines = [
    `Halo CANALAA, mau pesan:`,
    ``,
    `${product.name}`,
  ];

  if (size) {
    lines.push(`Ukuran: EU ${size.eu} (${size.cm} cm)`);
  }

  lines.push(``, `Harga: Rp ${product.price.toLocaleString("id-ID")}`);

  const text = encodeURIComponent(lines.join("\n"));
  return `https://wa.me/${WA_NUMBER}?text=${text}`;
}

export function buildGenericWhatsAppUrl(): string {
  const text = encodeURIComponent(
    "Halo CANALAA, mau tanya-tanya dulu sebelum pesan.",
  );
  return `https://wa.me/${WA_NUMBER}?text=${text}`;
}

export function formatIDR(amount: number): string {
  return `Rp ${amount.toLocaleString("id-ID")}`;
}
