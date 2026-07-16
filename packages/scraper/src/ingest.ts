import { PrismaClient } from "@dental-compare/db";
import { searchAllStores, storeAdapters } from "./index.js";
import { closeSharedBrowser } from "./utils/browserHttp.js";

const prisma = new PrismaClient();

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

async function ensureStores() {
  for (const adapter of storeAdapters) {
    await prisma.store.upsert({
      where: { slug: adapter.slug },
      update: { name: adapter.name, baseUrl: adapter.baseUrl },
      create: { slug: adapter.slug, name: adapter.name, baseUrl: adapter.baseUrl },
    });
  }
}

async function getTermsToScrape(): Promise<string[]> {
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

async function ingestTerm(term: string) {
  const results = await searchAllStores(term);
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
  await prisma.searchTerm.update({ where: { term }, data: { lastScrapedAt: new Date() } });
}

async function main() {
  await ensureStores();
  const terms = await getTermsToScrape();
  console.log(`Coletando ${terms.length} termo(s)...`);
  for (const term of terms) {
    console.log(`> ${term}`);
    await ingestTerm(term);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeSharedBrowser();
    await prisma.$disconnect();
  });
