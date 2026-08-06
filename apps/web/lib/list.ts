import { prisma } from "@/lib/db";

export interface ListItem {
  id: string;
  storeProductId: string;
  name: string;
  url: string;
  storeName: string;
  imageUrl: string | null;
  quantity: number;
  priceAtAdd: number;
  currentPrice: number | null;
  /** currentPrice - priceAtAdd; null when the product has no current price. */
  delta: number | null;
  /** currentPrice * quantity; null when the product has no current price. */
  subtotal: number | null;
  addedAt: string;
}

export interface ListSummary {
  items: ListItem[];
  total: number;
  /** How much the total moved since each item was added. */
  totalDelta: number;
  /** Items whose latest scrape found no price — excluded from the total. */
  itemsWithoutPrice: number;
}

/** Loads a user's shopping list with current prices and per-item price movement. */
export async function getListSummary(userId: string): Promise<ListSummary> {
  const rows = await prisma.shoppingListItem.findMany({
    where: { userId },
    include: {
      storeProduct: {
        include: {
          store: true,
          priceSnapshots: { orderBy: { scrapedAt: "desc" }, take: 1 },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const items: ListItem[] = rows.map((row) => {
    const currentPrice = row.storeProduct.priceSnapshots[0]?.price ?? null;
    return {
      id: row.id,
      storeProductId: row.storeProductId,
      name: row.storeProduct.name,
      url: row.storeProduct.url,
      storeName: row.storeProduct.store.name,
      imageUrl: row.storeProduct.imageUrl,
      quantity: row.quantity,
      priceAtAdd: row.priceAtAdd,
      currentPrice,
      delta: currentPrice === null ? null : currentPrice - row.priceAtAdd,
      subtotal: currentPrice === null ? null : currentPrice * row.quantity,
      addedAt: row.createdAt.toISOString(),
    };
  });

  return {
    items,
    total: items.reduce((sum, i) => sum + (i.subtotal ?? 0), 0),
    totalDelta: items.reduce((sum, i) => sum + (i.delta ?? 0) * i.quantity, 0),
    itemsWithoutPrice: items.filter((i) => i.currentPrice === null).length,
  };
}
