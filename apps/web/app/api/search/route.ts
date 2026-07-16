import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ error: "Digite ao menos 2 caracteres." }, { status: 400 });
  }

  try {
    const normalizedTerm = q.toLowerCase();
    const searchTerm = await prisma.searchTerm.upsert({
      where: { term: normalizedTerm },
      update: {},
      create: { term: normalizedTerm },
    });

    const storeProducts = await prisma.storeProduct.findMany({
      where: { name: { contains: q, mode: "insensitive" } },
      include: {
        store: true,
        priceSnapshots: { orderBy: { scrapedAt: "desc" }, take: 1 },
      },
      take: 100,
    });

    const results = storeProducts
      .filter((sp) => sp.priceSnapshots.length > 0)
      .map((sp) => {
        const snapshot = sp.priceSnapshots[0];
        return {
          id: sp.id,
          storeSlug: sp.store.slug,
          storeName: sp.store.name,
          name: sp.name,
          url: sp.url,
          imageUrl: sp.imageUrl,
          price: snapshot.price,
          pricePix: snapshot.pricePix,
          inStock: snapshot.inStock,
          scrapedAt: snapshot.scrapedAt,
        };
      })
      .sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));

    return NextResponse.json({
      query: q,
      tracked: searchTerm.lastScrapedAt !== null,
      results,
    });
  } catch (err) {
    console.error("GET /api/search failed:", err);
    return NextResponse.json(
      { error: "Não foi possível consultar os preços agora. Tente novamente em instantes." },
      { status: 500 },
    );
  }
}
