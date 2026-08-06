import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  // Alerts stay usable while logged out — the account link is a bonus, not a gate.
  const session = await auth();
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const storeProductId = typeof body?.storeProductId === "string" ? body.storeProductId : "";
  const targetPrice = Number(body?.targetPrice);

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "E-mail inválido." }, { status: 400 });
  }
  if (!storeProductId) {
    return NextResponse.json({ error: "Produto não informado." }, { status: 400 });
  }
  if (!Number.isFinite(targetPrice) || targetPrice <= 0) {
    return NextResponse.json({ error: "Preço alvo inválido." }, { status: 400 });
  }

  try {
    const storeProduct = await prisma.storeProduct.findUnique({ where: { id: storeProductId } });
    if (!storeProduct) {
      return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });
    }

    const alert = await prisma.priceAlert.create({
      data: { email, storeProductId, targetPrice, userId: session?.user?.id ?? null },
    });

    return NextResponse.json({ alert }, { status: 201 });
  } catch (err) {
    console.error("POST /api/alerts failed:", err);
    return NextResponse.json(
      { error: "Não foi possível salvar o alerta agora. Tente novamente em instantes." },
      { status: 500 },
    );
  }
}
