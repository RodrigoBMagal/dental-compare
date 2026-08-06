import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getListSummary } from "@/lib/list";
import { ShoppingList } from "@/components/ShoppingList";

// Always render fresh: prices change with every scrape run.
export const dynamic = "force-dynamic";

export default async function ListaPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const summary = await getListSummary(session.user.id);

  return (
    <main>
      <h1>Minha lista</h1>
      <p className="subtitle">
        Os preços são atualizados a cada coleta — a variação mostra quanto mudou desde que você
        adicionou cada item.
      </p>
      <ShoppingList initial={summary} />
    </main>
  );
}
