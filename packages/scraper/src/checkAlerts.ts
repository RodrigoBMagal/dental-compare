import { PrismaClient } from "@dental-compare/db";
import { Resend } from "resend";

const prisma = new PrismaClient();
const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.ALERTS_FROM_EMAIL ?? "Dental Compare <alertas@resend.dev>";

async function main() {
  const alerts = await prisma.priceAlert.findMany({
    where: { active: true, storeProductId: { not: null } },
    include: {
      storeProduct: {
        include: {
          store: true,
          priceSnapshots: { orderBy: { scrapedAt: "desc" }, take: 1 },
        },
      },
    },
  });

  console.log(`Verificando ${alerts.length} alerta(s) ativo(s)...`);

  for (const alert of alerts) {
    const sp = alert.storeProduct;
    const latest = sp?.priceSnapshots[0];
    if (!sp || !latest) continue;

    if (latest.price <= alert.targetPrice) {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: alert.email,
        subject: `Preço baixou: ${sp.name}`,
        html: `<p><strong>${sp.name}</strong> está por R$ ${latest.price.toFixed(2)} na ${sp.store.name} (sua meta era R$ ${alert.targetPrice.toFixed(2)}).</p><p><a href="${sp.url}">Ver produto na loja</a></p>`,
      });
      await prisma.priceAlert.update({
        where: { id: alert.id },
        data: { active: false, triggeredAt: new Date() },
      });
      console.log(`  alerta disparado: ${sp.name} -> ${alert.email}`);
    }
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
