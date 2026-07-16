import * as cheerio from "cheerio";
import { fetchHtmlViaBrowser } from "../utils/browserHttp.js";
import type { ScrapedProduct, StoreAdapter } from "../types.js";

/** Shared parser for the Magento-based stores (Dental Speed, Dental Cremer). */
export function createMagentoAdapter(opts: {
  slug: string;
  name: string;
  baseUrl: string;
}): StoreAdapter {
  return {
    slug: opts.slug,
    name: opts.name,
    baseUrl: opts.baseUrl,
    async search(query: string): Promise<ScrapedProduct[]> {
      const url = `${opts.baseUrl}/catalogsearch/result/?q=${encodeURIComponent(query)}`;
      const html = await fetchHtmlViaBrowser(url);
      const $ = cheerio.load(html);

      const products: ScrapedProduct[] = [];
      $("li.item.product-item").each((_, el) => {
        const card = $(el);
        const nameLink = card.find("a.product-item-link").first();
        const name = nameLink.text().trim();
        if (!name) return;
        const href = nameLink.attr("href");

        const finalPriceEl = card.find('[data-price-type="finalPrice"]').first();
        const priceAmount = finalPriceEl.attr("data-price-amount");
        const price = priceAmount ? Number.parseFloat(priceAmount) : null;

        const img = card.find("img.product-image-photo").first();
        const imageUrl = img.attr("src") ?? null;
        const sku = card.find("[data-sku]").first().attr("data-sku") ?? null;
        const inStock = card.find(".stock.unavailable").length === 0;

        products.push({
          storeSlug: opts.slug,
          name,
          price: price !== null && Number.isFinite(price) ? price : null,
          pricePix: null,
          url: href ?? url,
          imageUrl,
          sku,
          inStock,
        });
      });
      return products;
    },
  };
}
