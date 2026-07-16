import * as cheerio from "cheerio";
import { fetchHtml } from "../utils/http.js";
import type { ScrapedProduct, StoreAdapter } from "../types.js";

const BASE_URL = "https://www.ortojaspe.com.br";

export const ortoJaspe: StoreAdapter = {
  slug: "orto-jaspe",
  name: "Orto Jaspe",
  baseUrl: BASE_URL,
  async search(query: string): Promise<ScrapedProduct[]> {
    const url = `${BASE_URL}/buscar?q=${encodeURIComponent(query)}`;
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);

    const products: ScrapedProduct[] = [];
    $(".listagem-item").each((_, el) => {
      const card = $(el);
      const nameLink = card.find("a.nome-produto").first();
      const name = nameLink.text().trim();
      if (!name) return;
      const href = nameLink.attr("href");

      const priceEl = card.find("[data-sell-price]").first();
      const priceAttr = priceEl.attr("data-sell-price");
      const price = priceAttr ? Number.parseFloat(priceAttr) : null;

      const img = card.find("img.imagem-principal").first();
      const imageUrl = img.attr("src") ?? img.attr("data-imagem-caminho") ?? null;
      const sku = card.attr("data-id") ?? null;

      products.push({
        storeSlug: "orto-jaspe",
        name,
        price: price !== null && Number.isFinite(price) ? price : null,
        pricePix: null,
        url: href ? new URL(href, BASE_URL).toString() : url,
        imageUrl,
        sku,
        inStock: true,
      });
    });
    return products;
  },
};
