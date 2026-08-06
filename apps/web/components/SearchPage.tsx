"use client";

import { useState } from "react";
import { AlertButton } from "@/components/AlertButton";
import { AddToListButton } from "@/components/AddToListButton";
import { formatBRL } from "@/lib/format";

interface SearchResult {
  id: string;
  storeSlug: string;
  storeName: string;
  name: string;
  url: string;
  imageUrl: string | null;
  price: number;
  pricePix: number | null;
  inStock: boolean;
  scrapedAt: string;
}

export function SearchPage({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [tracked, setTracked] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim().length < 2) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) {
        setError(data?.error ?? "Erro ao buscar. Tente novamente.");
        setResults(null);
      } else {
        setResults(data.results);
        setTracked(data.tracked);
      }
    } catch {
      setError("Não foi possível conectar. Verifique sua internet e tente novamente.");
      setResults(null);
    } finally {
      setLoading(false);
    }
  }

  const lowestPrice = results?.length ? Math.min(...results.map((r) => r.price)) : null;

  return (
    <main>
      <h1>Dental Compare</h1>
      <p className="subtitle">Ache o menor preço em segundos.</p>

      <form className="search-form" onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="Ex: resina composta, luva de procedimento, alginato..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit" disabled={loading}>
          {loading ? "Buscando..." : "Buscar"}
        </button>
      </form>

      {error && <div className="notice">{error}</div>}

      {results && !tracked && (
        <div className="notice">
          Ainda não coletamos preços para este termo. Ele foi adicionado à lista de coleta — volte
          em algumas horas para ver os resultados.
        </div>
      )}

      {results && results.length === 0 && tracked && (
        <div className="notice">Nenhum produto encontrado para essa busca.</div>
      )}

      {results && results.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Produto</th>
              <th>Loja</th>
              <th>Preço</th>
              <th>Estoque</th>
              <th></th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => (
              <tr key={r.id}>
                <td data-label="Produto">
                  <a className="store-link" href={r.url} target="_blank" rel="noreferrer">
                    {r.name}
                  </a>
                </td>
                <td data-label="Loja">{r.storeName}</td>
                <td data-label="Preço" className={r.price === lowestPrice ? "best-price" : undefined}>
                  {formatBRL(r.price)}
                </td>
                <td data-label="Estoque">{r.inStock ? "Em estoque" : "Indisponível"}</td>
                <td data-label="">
                  <AddToListButton storeProductId={r.id} isLoggedIn={isLoggedIn} />
                </td>
                <td data-label="">
                  <AlertButton storeProductId={r.id} currentPrice={r.price} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
