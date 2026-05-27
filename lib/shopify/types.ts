// lib/shopify/types.ts — Vercel Commerce type contract (Shopify-shaped)
export type SortKey = 'RELEVANCE' | 'BEST_SELLING' | 'CREATED_AT' | 'PRICE';

export type Money = { amount: string; currencyCode: string };

export type Image = {
  url: string;
  altText: string;
  width: number;
  height: number;
};

export type SEO = { title: string; description: string };

export type ProductOption = { id: string; name: string; values: string[] };

export type ProductVariant = {
  id: string;
  title: string;
  availableForSale: boolean;
  selectedOptions: { name: string; value: string }[];
  price: Money;
};

export type Product = {
  id: string;
  handle: string;
  availableForSale: boolean;
  title: string;
  description: string;
  descriptionHtml: string;
  options: ProductOption[];
  priceRange: { maxVariantPrice: Money; minVariantPrice: Money };
  variants: ProductVariant[];
  featuredImage: Image;
  images: Image[];
  seo: SEO;
  tags: string[];
  categorySlugs: string[];
  updatedAt: string;
};

export type CartProduct = {
  id: string;
  handle: string;
  title: string;
  featuredImage: Image;
};

export type CartItem = {
  id: string;
  handle: string;
  merchandiseId: string;
  quantity: number;
  cost: { totalAmount: Money };
  lineTotal: Money;
  product: CartProduct;
  merchandise: {
    id: string;
    title: string;
    selectedOptions: { name: string; value: string }[];
    product: CartProduct;
  };
};

export type Cart = {
  id: string;
  checkoutUrl: string;
  cost: {
    subtotalAmount: Money;
    totalAmount: Money;
    totalTaxAmount: Money;
  };
  lines: CartItem[];
  totalQuantity: number;
};

export type Collection = {
  handle: string;
  title: string;
  description: string;
  seo: SEO;
  path: string;
  updatedAt: string;
};

export type Menu = { title: string; path: string };
