import { searchAllStores } from "./index.js";
import { closeSharedBrowser } from "./utils/browserHttp.js";

const query = process.argv.slice(2).join(" ") || "resina composta";

const results = await searchAllStores(query);
for (const r of results) {
  console.log(`\n=== ${r.storeName} (${r.products.length} produtos) ===`);
  if (r.error) console.log(`  ERRO: ${r.error}`);
  for (const p of r.products.slice(0, 5)) {
    console.log(`  ${p.name} — ${p.price ?? "?"} — ${p.url}`);
  }
}
await closeSharedBrowser();
