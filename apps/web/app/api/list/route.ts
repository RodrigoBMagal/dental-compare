import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getListSummary } from "@/lib/list";

const UNAUTHORIZED = NextResponse.json(
  { error: "Você precisa entrar para usar a lista." },
  { status: 401 },
);

const GENERIC_ERROR = { error: "Não foi possível atualizar sua lista agora. Tente novamente." };

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return UNAUTHORIZED;

  try {
    return NextResponse.json(await getListSummary(session.user.id));
  } catch (err) {
    console.error("GET /api/list failed:", err);
    return NextResponse.json(GENERIC_ERROR, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return UNAUTHORIZED;

  const body = await req.json().catch(() => null);
  const storeProductId = typeof body?.storeProductId === "string" ? body.storeProductId : "";
  const quantity = Number.isFinite(Number(body?.quantity)) ? Math.trunc(Number(body.quantity)) : 1;

  if (!storeProductId) {
    return NextResponse.json({ error: "Produto não informado." }, { status: 400 });
  }
  if (quantity < 1) {
    return NextResponse.json({ error: "Quantidade inválida." }, { status: 400 });
  }

  try {
    const storeProduct = await prisma.storeProduct.findUnique({
      where: { id: storeProductId },
      include: { priceSnapshots: { orderBy: { scrapedAt: "desc" }, take: 1 } },
    });
    if (!storeProduct) {
      return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });
    }

    const currentPrice = storeProduct.priceSnapshots[0]?.price;
    if (currentPrice === undefined) {
      return NextResponse.json(
        { error: "Este produto ainda não tem preço coletado." },
        { status: 409 },
      );
    }

    // Adding something already on the list bumps its quantity instead of erroring,
    // and deliberately keeps the original priceAtAdd so the movement shown stays
    // anchored to when the user first added it.
    await prisma.shoppingListItem.upsert({
      where: {
        userId_storeProductId: { userId: session.user.id, storeProductId },
      },
      update: { quantity: { increment: quantity } },
      create: {
        userId: session.user.id,
        storeProductId,
        quantity,
        priceAtAdd: currentPrice,
      },
    });

    return NextResponse.json(await getListSummary(session.user.id), { status: 201 });
  } catch (err) {
    console.error("POST /api/list failed:", err);
    return NextResponse.json(GENERIC_ERROR, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return UNAUTHORIZED;

  const body = await req.json().catch(() => null);
  const itemId = typeof body?.itemId === "string" ? body.itemId : "";
  const quantity = Math.trunc(Number(body?.quantity));

  if (!itemId) {
    return NextResponse.json({ error: "Item não informado." }, { status: 400 });
  }
  if (!Number.isFinite(quantity) || quantity < 1) {
    return NextResponse.json({ error: "Quantidade inválida." }, { status: 400 });
  }

  try {
    // userId in the where clause keeps one user from editing another's item.
    const { count } = await prisma.shoppingListItem.updateMany({
      where: { id: itemId, userId: session.user.id },
      data: { quantity },
    });
    if (count === 0) {
      return NextResponse.json({ error: "Item não encontrado." }, { status: 404 });
    }

    return NextResponse.json(await getListSummary(session.user.id));
  } catch (err) {
    console.error("PATCH /api/list failed:", err);
    return NextResponse.json(GENERIC_ERROR, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return UNAUTHORIZED;

  const itemId = req.nextUrl.searchParams.get("itemId") ?? "";
  if (!itemId) {
    return NextResponse.json({ error: "Item não informado." }, { status: 400 });
  }

  try {
    const { count } = await prisma.shoppingListItem.deleteMany({
      where: { id: itemId, userId: session.user.id },
    });
    if (count === 0) {
      return NextResponse.json({ error: "Item não encontrado." }, { status: 404 });
    }

    return NextResponse.json(await getListSummary(session.user.id));
  } catch (err) {
    console.error("DELETE /api/list failed:", err);
    return NextResponse.json(GENERIC_ERROR, { status: 500 });
  }
}
