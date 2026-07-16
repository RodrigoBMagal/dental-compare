import * as cheerio from "cheerio";
import { fetchHtml } from "../utils/http.js";
import { parseBRLPrice } from "../utils/price.js";
import type { ScrapedProduct, StoreAdapter } from "../types.js";

const BASE_URL = "https://www.dentalintegra.com.br";
const LOJA_ID = "1170430";

export const dentalIntegra: StoreAdapter = {
  slug: "dental-integra",
  name: "Dental Integra",
  baseUrl: BASE_URL,
  async search(query: string): Promise<ScrapedProduct[]> {
    const url = `${BASE_URL}/loja/busca.php?loja=${LOJA_ID}&palavra_busca=${encodeURIComponent(query)}`;
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);

    const products: ScrapedProduct[] = [];
    $("li.item").each((_, el) => {
      const card = $(el);
      const link = card.find("a.product-info").first();
      const name = card.find(".product-name").first().text().trim();
      if (!name) return;
      const href = link.attr("href");
      const priceText = card.find(".current-price").first().text();
      const img = card.find("img").first();
      const imageUrl = img.attr("data-src") ?? img.attr("src") ?? null;

      products.push({
        storeSlug: "dental-integra",
        name,
        price: parseBRLPrice(priceText),
        pricePix: null,
        url: href ? new URL(href, BASE_URL).toString() : url,
        imageUrl,
        sku: null,
        inStock: true,
      });
    });
    return products;
  },
};
