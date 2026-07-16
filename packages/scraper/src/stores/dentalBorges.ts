import { fetchHtml } from "../utils/http.js";
import type { ScrapedProduct, StoreAdapter } from "../types.js";

interface BorgesItem {
  id: string;
  title: string;
  brand?: string;
  slug: string;
  price?: number | null;
  photos?: string[];
  active?: boolean;
}

const BASE_URL = "https://dentalborges.com.br";

function extractNextData(html: string): any {
  const marker = "__NEXT_DATA__";
  const start = html.indexOf(marker);
  if (start === -1) throw new Error("dentalBorges: __NEXT_DATA__ not found");
  const scriptStart = html.indexOf(">", start) + 1;
  const scriptEnd = html.indexOf("</script>", scriptStart);
  return JSON.parse(html.slice(scriptStart, scriptEnd));
}

export const dentalBorges: StoreAdapter = {
  slug: "dental-borges",
  name: "Dental Borges",
  baseUrl: BASE_URL,
  async search(query: string): Promise<ScrapedProduct[]> {
    const url = `${BASE_URL}/busca/${encodeURIComponent(query)}`;
    const html = await fetchHtml(url);
    const nextData = extractNextData(html);
    const items: BorgesItem[] =
      nextData?.props?.pageProps?.serverSideProps?.data?.items ?? [];

    return items.map((item) => {
      const slug = item.slug.replace(/^\//, "");
      return {
        storeSlug: "dental-borges",
        name: item.brand ? `${item.title} - ${item.brand}` : item.title,
        price: item.price ?? null,
        pricePix: null,
        url: `${BASE_URL}/${slug}`,
        imageUrl: item.photos?.[0] ?? null,
        sku: item.id,
        inStock: item.active !== false,
      };
    });
  },
};
