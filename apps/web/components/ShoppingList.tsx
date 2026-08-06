"use client";

import { useState } from "react";
import Link from "next/link";
import { formatBRL, formatDelta } from "@/lib/format";
import type { ListSummary } from "@/lib/list";

export function ShoppingList({ initial }: { initial: ListSummary }) {
  const [summary, setSummary] = useState(initial);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function mutate(id: string, request: () => Promise<Response>) {
    setBusyId(id);
    setError(null);
    try {
      const res = await request();
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) {
        setError(data?.error ?? "Não foi possível atualizar a lista.");
        return;
      }
      setSummary(data);
    } catch {
      setError("Não foi possível conectar. Verifique sua internet e tente novamente.");
    } finally {
      setBusyId(null);
    }
  }

  const changeQuantity = (itemId: string, quantity: number) =>
    mutate(itemId, () =>
      fetch("/api/list", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, quantity }),
      }),
    );

  const removeItem = (itemId: string) =>
    mutate(itemId, () =>
      fetch(`/api/list?itemId=${encodeURIComponent(itemId)}`, { method: "DELETE" }),
    );

  if (summary.items.length === 0) {
    return (
      <div className="notice">
        Sua lista está vazia. Busque um produto na <Link href="/">página inicial</Link> e clique em
        &quot;+ lista&quot; para adicionar.
      </div>
    );
  }

  return (
    <>
      {error && <div className="notice">{error}</div>}

      <table>
        <thead>
          <tr>
            <th>Produto</th>
            <th>Loja</th>
            <th>Qtd</th>
            <th>Preço</th>
            <th>Subtotal</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {summary.items.map((item) => (
            <tr key={item.id} className={busyId === item.id ? "row-busy" : undefined}>
              <td data-label="Produto">
                <a className="store-link" href={item.url} target="_blank" rel="noreferrer">
                  {item.name}
                </a>
              </td>
              <td data-label="Loja">{item.storeName}</td>
              <td data-label="Qtd">
                <input
                  type="number"
                  min={1}
                  value={item.quantity}
                  disabled={busyId === item.id}
                  className="qty-input"
                  onChange={(e) => {
                    const quantity = Number(e.target.value);
                    if (Number.isFinite(quantity) && quantity >= 1) {
                      changeQuantity(item.id, quantity);
                    }
                  }}
                />
              </td>
              <td data-label="Preço">
                {item.currentPrice === null ? (
                  <span className="text-muted">sem preço</span>
                ) : (
                  <>
                    {formatBRL(item.currentPrice)}
                    {item.delta !== null && Math.abs(item.delta) >= 0.01 && (
                      <span className={item.delta < 0 ? "delta-down" : "delta-up"}>
                        {item.delta < 0 ? "▼" : "▲"} {formatDelta(item.delta)}
                      </span>
                    )}
                  </>
                )}
              </td>
              <td data-label="Subtotal">
                {item.subtotal === null ? "—" : formatBRL(item.subtotal)}
              </td>
              <td>
                <button
                  className="link-btn"
                  disabled={busyId === item.id}
                  onClick={() => removeItem(item.id)}
                  aria-label={`Remover ${item.name}`}
                >
                  Remover
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="list-total">
        <div>
          <span className="list-total-label">Total</span>
          <strong className="list-total-value">{formatBRL(summary.total)}</strong>
        </div>
        {Math.abs(summary.totalDelta) >= 0.01 && (
          <p className={summary.totalDelta < 0 ? "delta-down" : "delta-up"}>
            {summary.totalDelta < 0 ? "▼" : "▲"} {formatDelta(summary.totalDelta)} desde que você
            adicionou os itens
          </p>
        )}
        {summary.itemsWithoutPrice > 0 && (
          <p className="text-muted">
            {summary.itemsWithoutPrice}{" "}
            {summary.itemsWithoutPrice === 1 ? "item está" : "itens estão"} sem preço na última
            coleta e {summary.itemsWithoutPrice === 1 ? "não entrou" : "não entraram"} no total.
          </p>
        )}
        <p className="text-muted">
          Os itens podem ser de lojas diferentes — o total é a soma simples, sem considerar frete.
        </p>
      </div>
    </>
  );
}
