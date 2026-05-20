export type Size = {
  eu: number;
  cm: number;
  inStock: boolean;
};

export type Product = {
  slug: string;
  name: string;
  price: number;
  images: string[];
  sizes: Size[];
  featured: boolean;
};
