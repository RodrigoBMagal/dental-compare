import { chromium } from "playwright";
import type { ScrapedProduct, StoreAdapter } from "../types.js";

// Status as of the last attempt: running this from a residential IP (a self-hosted
// GitHub Actions runner at home) gets past Akamai's IP-reputation blocking, but
// Akamai still returns an "Access Denied" HTML page instead of the GraphQL response —
// consistent with headless-browser fingerprinting rather than (or in addition to)
// IP-based blocking. Getting past that would need real anti-detection work (e.g.
// running Chromium non-headless under a virtual display, patching automation
// fingerprints) that hasn't been attempted yet.
const BASE_URL = "https://www.suryadental.com.br";

const SEARCH_QUERY = /* GraphQL */ `
  query ProductSearch($search: String!) {
    products(search: $search, pageSize: 24) {
      total_count
      items {
        id
        name
        sku
        url_key
        small_image {
          url
        }
        stock_status
        price_range {
          minimum_price {
            final_price {
              value
            }
          }
        }
      }
    }
  }
`;

interface MagentoProductsResponse {
  data?: {
    products?: {
      items: Array<{
        id: number;
        name: string;
        sku: string;
        url_key: string;
        small_image?: { url?: string };
        stock_status?: string;
        price_range?: {
          minimum_price?: { final_price?: { value?: number } };
        };
      }>;
    };
  };
  errors?: unknown[];
}

export const suryaDental: StoreAdapter = {
  slug: "surya-dental",
  name: "Surya Dental",
  baseUrl: BASE_URL,
  async search(query: string): Promise<ScrapedProduct[]> {
    const browser = await chromium.launch({ headless: true });
    try {
      const context = await browser.newContext({
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        locale: "pt-BR",
      });
      const page = await context.newPage();
      // Real navigation first establishes cookies/session that satisfy Akamai's bot checks.
      await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });

      const result: MagentoProductsResponse = await page.evaluate(
        async ({ query: gqlQuery, search }) => {
          const res = await fetch("/graphql", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              query: gqlQuery,
              variables: { search },
              operationName: "ProductSearch",
            }),
          });
          return res.json();
        },
        { query: SEARCH_QUERY, search: query },
      );

      const items = result.data?.products?.items ?? [];
      return items.map((item) => ({
        storeSlug: "surya-dental",
        name: item.name,
        price: item.price_range?.minimum_price?.final_price?.value ?? null,
        pricePix: null,
        url: `${BASE_URL}/${item.url_key}.html`,
        imageUrl: item.small_image?.url ?? null,
        sku: item.sku ?? null,
        inStock: item.stock_status !== "OUT_OF_STOCK",
      }));
    } finally {
      await browser.close();
    }
  },
};
