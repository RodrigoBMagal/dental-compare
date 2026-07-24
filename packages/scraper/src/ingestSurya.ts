import { PrismaClient } from "@dental-compare/db";
import { experimentalStoreAdapters } from "./index.js";
import { runIngest } from "./ingestCore.js";
import { closeSharedBrowser } from "./utils/browserHttp.js";

// Meant to run from a residential network (e.g. a self-hosted GitHub Actions
// runner at home) — Surya Dental's Akamai bot manager blocks datacenter IPs.
const prisma = new PrismaClient();

runIngest(prisma, experimentalStoreAdapters)
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeSharedBrowser();
    await prisma.$disconnect();
  });
