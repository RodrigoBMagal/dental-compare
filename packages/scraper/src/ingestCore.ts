import { PrismaClient } from "@dental-compare/db";
import { searchAllStoresWith } from "./index.js";
import type { StoreAdapter } from "./types.js";

const DEFAULT_TERMS = [
  "resina composta",
  "luva de procedimento",
  "clareador dental",
  "anestesico odontologico",
  "fio de sutura",
  "broca odontologica",
  "alginato",
  "sugador odontologico",
  "cimento resinoso",
  "acido fosforico",
];

async function ensureStores(prisma: PrismaClient, adapters: StoreAdapter[]) {
  for (const adapter of adapters) {
    await prisma.store.upsert({
      where: { slug: adapter.slug },
      update: { name: adapter.name, baseUrl: adapter.baseUrl },
      create: { slug: adapter.slug, name: adapter.name, baseUrl: adapter.baseUrl },
    });
  }
}

async function getTermsToScrape(prisma: PrismaClient): Promise<string[]> {
  const existing = await prisma.searchTerm.findMany({ select: { term: true } });
  if (existing.length === 0) {
    await prisma.searchTerm.createMany({
      data: DEFAULT_TERMS.map((term) => ({ term })),
      skipDuplicates: true,
    });
    return DEFAULT_TERMS;
  }
  return existing.map((e) => e.term);
}

async function ingestTerm(prisma: PrismaClient, adapters: StoreAdapter[], term: string) {
  const results = await searchAllStoresWith(adapters, term);
  for (const r of results) {
    if (r.error) {
      console.error(`  [${r.storeSlug}] erro: ${r.error}`);
      continue;
    }
    const store = await prisma.store.findUniqueOrThrow({ where: { slug: r.storeSlug } });
    for (const p of r.products) {
      if (p.price === null) continue;
      const storeProduct = await prisma.storeProduct.upsert({
        where: { storeId_url: { storeId: store.id, url: p.url } },
        update: {
          name: p.name,
          imageUrl: p.imageUrl,
          externalId: p.sku,
          lastSeenAt: new Date(),
        },
        create: {
          storeId: store.id,
          url: p.url,
          name: p.name,
          imageUrl: p.imageUrl,
          externalId: p.sku,
        },
      });
      await prisma.priceSnapshot.create({
        data: {
          storeProductId: storeProduct.id,
          price: p.price,
          pricePix: p.pricePix,
          inStock: p.inStock,
        },
      });
    }
    console.log(`  [${r.storeSlug}] ${r.products.length} produtos`);
  }
}

/** Scrapes every tracked search term across the given store adapters and upserts the results. */
export async function runIngest(prisma: PrismaClient, adapters: StoreAdapter[]): Promise<void> {
  await ensureStores(prisma, adapters);
  const terms = await getTermsToScrape(prisma);
  console.log(`Coletando ${terms.length} termo(s)...`);
  for (const term of terms) {
    console.log(`> ${term}`);
    await ingestTerm(prisma, adapters, term);
    await prisma.searchTerm.update({ where: { term }, data: { lastScrapedAt: new Date() } });
  }
}
