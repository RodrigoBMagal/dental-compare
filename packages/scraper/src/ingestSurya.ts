import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { experimentalStoreAdapters, searchAllStoresWith } from "./index.js";
import { DEFAULT_SEARCH_TERMS } from "./ingestCore.js";
import { closeSharedBrowser } from "./utils/browserHttp.js";

// Bypasses Prisma Client entirely. On the self-hosted runner this job targets,
// Prisma's Rust query engine fails to reach Neon ("Can't reach database server")
// even though raw TCP, TLS, and a full psql session all connect fine in the same
// container — isolated by hand across several attempts (pooled/direct endpoint,
// with/without the Neon SNI endpoint-override param, IPv6 confirmed disabled).
// node-postgres speaks the wire protocol directly and works, so this ingest path
// uses it instead of going through packages/db's Prisma client.
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function ensureStores() {
  for (const adapter of experimentalStoreAdapters) {
    await pool.query(
      `INSERT INTO "Store" (id, slug, name, "baseUrl")
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (slug) DO UPDATE SET name = $3, "baseUrl" = $4`,
      [randomUUID(), adapter.slug, adapter.name, adapter.baseUrl],
    );
  }
}

async function getTermsToScrape(): Promise<string[]> {
  const { rows } = await pool.query<{ term: string }>('SELECT term FROM "SearchTerm"');
  if (rows.length === 0) {
    for (const term of DEFAULT_SEARCH_TERMS) {
      await pool.query(
        `INSERT INTO "SearchTerm" (id, term) VALUES ($1, $2) ON CONFLICT (term) DO NOTHING`,
        [randomUUID(), term],
      );
    }
    return DEFAULT_SEARCH_TERMS;
  }
  return rows.map((r) => r.term);
}

async function ingestTerm(term: string) {
  const results = await searchAllStoresWith(experimentalStoreAdapters, term);
  for (const r of results) {
    if (r.error) {
      console.error(`  [${r.storeSlug}] erro: ${r.error}`);
      continue;
    }
    const {
      rows: [store],
    } = await pool.query<{ id: string }>('SELECT id FROM "Store" WHERE slug = $1', [r.storeSlug]);

    for (const p of r.products) {
      if (p.price === null) continue;
      const {
        rows: [storeProduct],
      } = await pool.query<{ id: string }>(
        `INSERT INTO "StoreProduct" (id, "storeId", url, name, "imageUrl", "externalId", "lastSeenAt")
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         ON CONFLICT ("storeId", url)
         DO UPDATE SET name = $4, "imageUrl" = $5, "externalId" = $6, "lastSeenAt" = NOW()
         RETURNING id`,
        [randomUUID(), store.id, p.url, p.name, p.imageUrl, p.sku],
      );
      await pool.query(
        `INSERT INTO "PriceSnapshot" (id, "storeProductId", price, "pricePix", "inStock", "scrapedAt")
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [randomUUID(), storeProduct.id, p.price, p.pricePix, p.inStock],
      );
    }
    console.log(`  [${r.storeSlug}] ${r.products.length} produtos`);
  }
  await pool.query('UPDATE "SearchTerm" SET "lastScrapedAt" = NOW() WHERE term = $1', [term]);
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
    await pool.end();
  });
