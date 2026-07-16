import { dentalBorges } from "./stores/dentalBorges.js";
import { dentalIntegra } from "./stores/dentalIntegra.js";
import { dentalSpeed } from "./stores/dentalSpeed.js";
import { dentalCremer } from "./stores/dentalCremer.js";
import { ortoJaspe } from "./stores/ortoJaspe.js";
import { suryaDental } from "./stores/suryaDental.js";
import type { ScrapedProduct, StoreAdapter } from "./types.js";

/** The 5 stores that scrape reliably from any host, including cloud/CI runners. */
export const storeAdapters: StoreAdapter[] = [
  dentalBorges,
  dentalIntegra,
  dentalSpeed,
  dentalCremer,
  ortoJaspe,
];

/**
 * Surya Dental sits behind an Akamai bot manager that blocks datacenter/cloud IPs
 * (GitHub Actions, Vercel, most VPS providers). Its adapter works when run from a
 * residential network, so it's kept available but opt-in rather than in the default
 * scraping set used by the hosted app.
 */
export const experimentalStoreAdapters: StoreAdapter[] = [suryaDental];

export type { ScrapedProduct, StoreAdapter };

export interface StoreSearchResult {
  storeSlug: string;
  storeName: string;
  products: ScrapedProduct[];
  error: string | null;
}

/** Searches every store in parallel. A failure in one store never aborts the others. */
export async function searchAllStores(query: string): Promise<StoreSearchResult[]> {
  return Promise.all(
    storeAdapters.map(async (adapter) => {
      try {
        const products = await adapter.search(query);
        return { storeSlug: adapter.slug, storeName: adapter.name, products, error: null };
      } catch (err) {
        return {
          storeSlug: adapter.slug,
          storeName: adapter.name,
          products: [],
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }),
  );
}
