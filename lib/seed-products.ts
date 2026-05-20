import type { Product } from "./types";

const ph = (bg: string, fg: string, text: string) =>
  `https://placehold.co/1200x1200/${bg}/${fg}.png?text=${encodeURIComponent(text)}&font=montserrat`;

export const seedProducts: Product[] = [
  {
    slug: "runner-black",
    name: "Runner Black",
    price: 485000,
    images: [
      ph("0a0a0a", "ffffff", "Runner Black"),
      ph("1a1a1a", "ffffff", "Side View"),
      ph("2a2a2a", "ffffff", "Top View"),
      ph("0a0a0a", "f2ebdd", "Sole"),
    ],
    sizes: [
      { eu: 39, cm: 24.5, inStock: true },
      { eu: 40, cm: 25, inStock: true },
      { eu: 41, cm: 25.5, inStock: true },
      { eu: 42, cm: 26, inStock: true },
      { eu: 43, cm: 26.5, inStock: false },
      { eu: 44, cm: 27, inStock: true },
    ],
    featured: true,
  },
  {
    slug: "runner-cream",
    name: "Runner Cream",
    price: 485000,
    images: [
      ph("f2ebdd", "0a0a0a", "Runner Cream"),
      ph("e8e0d0", "0a0a0a", "Side View"),
      ph("d8d0c0", "0a0a0a", "Top View"),
      ph("f2ebdd", "1a1a1a", "Sole"),
    ],
    sizes: [
      { eu: 39, cm: 24.5, inStock: true },
      { eu: 40, cm: 25, inStock: true },
      { eu: 41, cm: 25.5, inStock: true },
      { eu: 42, cm: 26, inStock: true },
      { eu: 43, cm: 26.5, inStock: true },
      { eu: 44, cm: 27, inStock: true },
    ],
    featured: true,
  },
  {
    slug: "slipon-white",
    name: "Slip-On White",
    price: 465000,
    images: [
      ph("ffffff", "0a0a0a", "Slip-On White"),
      ph("f4f4f4", "0a0a0a", "Side View"),
      ph("eaeaea", "0a0a0a", "Top View"),
    ],
    sizes: [
      { eu: 38, cm: 24, inStock: true },
      { eu: 39, cm: 24.5, inStock: true },
      { eu: 40, cm: 25, inStock: true },
      { eu: 41, cm: 25.5, inStock: false },
      { eu: 42, cm: 26, inStock: true },
      { eu: 43, cm: 26.5, inStock: true },
    ],
    featured: true,
  },
  {
    slug: "court-low-black",
    name: "Court Low Black",
    price: 495000,
    images: [
      ph("0a0a0a", "f2ebdd", "Court Low Black"),
      ph("1a1a1a", "f2ebdd", "Side View"),
      ph("2a2a2a", "ffffff", "Detail"),
    ],
    sizes: [
      { eu: 39, cm: 24.5, inStock: true },
      { eu: 40, cm: 25, inStock: true },
      { eu: 41, cm: 25.5, inStock: true },
      { eu: 42, cm: 26, inStock: true },
      { eu: 43, cm: 26.5, inStock: true },
      { eu: 44, cm: 27, inStock: false },
    ],
    featured: false,
  },
  {
    slug: "trail-olive",
    name: "Trail Olive",
    price: 525000,
    images: [
      ph("4a5d23", "ffffff", "Trail Olive"),
      ph("3d4e1d", "ffffff", "Side View"),
      ph("556b2f", "ffffff", "Outsole"),
    ],
    sizes: [
      { eu: 40, cm: 25, inStock: true },
      { eu: 41, cm: 25.5, inStock: true },
      { eu: 42, cm: 26, inStock: true },
      { eu: 43, cm: 26.5, inStock: true },
      { eu: 44, cm: 27, inStock: true },
      { eu: 45, cm: 27.5, inStock: true },
    ],
    featured: false,
  },
];

export function getProductBySlug(slug: string): Product | undefined {
  return seedProducts.find((p) => p.slug === slug);
}

export function getFeaturedProducts(): Product[] {
  return seedProducts.filter((p) => p.featured);
}
