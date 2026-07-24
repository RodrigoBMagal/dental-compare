import { Pool } from "pg";
import nodemailer from "nodemailer";

// Uses pg directly rather than Prisma Client: this script runs on the same
// self-hosted runner as ingestSurya.ts, where Prisma's query engine fails to reach
// Neon for reasons isolated but not fully root-caused (see CLAUDE.md). Raw
// node-postgres connections work fine there.
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

interface DueAlert {
  id: string;
  email: string;
  targetPrice: number;
  productName: string;
  productUrl: string;
  storeName: string;
  latestPrice: number;
}

async function main() {
  const { rows: alerts } = await pool.query<DueAlert>(
    `SELECT
       pa.id,
       pa.email,
       pa."targetPrice"  AS "targetPrice",
       sp.name           AS "productName",
       sp.url            AS "productUrl",
       s.name            AS "storeName",
       ps.price          AS "latestPrice"
     FROM "PriceAlert" pa
     JOIN "StoreProduct" sp ON sp.id = pa."storeProductId"
     JOIN "Store" s ON s.id = sp."storeId"
     JOIN LATERAL (
       SELECT price FROM "PriceSnapshot"
       WHERE "storeProductId" = sp.id
       ORDER BY "scrapedAt" DESC
       LIMIT 1
     ) ps ON true
     WHERE pa.active = true AND pa."storeProductId" IS NOT NULL`,
  );

  console.log(`Verificando ${alerts.length} alerta(s) ativo(s)...`);

  for (const alert of alerts) {
    if (alert.latestPrice > alert.targetPrice) continue;

    await transporter.sendMail({
      from: `Dental Compare <${process.env.GMAIL_USER}>`,
      to: alert.email,
      subject: `Preço baixou: ${alert.productName}`,
      html: `<p><strong>${alert.productName}</strong> está por R$ ${alert.latestPrice.toFixed(2)} na ${alert.storeName} (sua meta era R$ ${alert.targetPrice.toFixed(2)}).</p><p><a href="${alert.productUrl}">Ver produto na loja</a></p>`,
    });
    await pool.query(
      `UPDATE "PriceAlert" SET active = false, "triggeredAt" = NOW() WHERE id = $1`,
      [alert.id],
    );
    console.log(`  alerta disparado: ${alert.productName} -> ${alert.email}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
