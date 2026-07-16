export interface ScrapedProduct {
  storeSlug: string;
  name: string;
  price: number | null;
  pricePix: number | null;
  url: string;
  imageUrl: string | null;
  sku: string | null;
  inStock: boolean;
}

export interface StoreAdapter {
  slug: string;
  name: string;
  baseUrl: string;
  search(query: string): Promise<ScrapedProduct[]>;
}
