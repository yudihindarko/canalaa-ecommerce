export const PRODUCT_CATEGORIES = [
  "Sepatu",
  "Jaket",
  "Kaos",
  "Celana",
  "Other",
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

/**
 * Keyword-based category detection from product name.
 * Default falls back to "Sepatu" since CANALAA is primarily a shoe store.
 * Admins can override the result manually in /admin.
 */
export function detectCategory(productName: string): ProductCategory {
  const u = productName.toUpperCase();
  if (/\b(KAOS|TSHIRT|T-SHIRT|TEE)\b/.test(u)) return "Kaos";
  if (/\b(JAKET|JACKET|HOODIE|SWEATER|VEST)\b/.test(u)) return "Jaket";
  if (/\b(CELANA|PANTS|SHORTS|CARGO|JEANS|TROUSERS)\b/.test(u)) return "Celana";
  return "Sepatu";
}
