export function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Formats a price movement with an explicit sign, e.g. "-R$ 12,00". */
export function formatDelta(value: number): string {
  const sign = value > 0 ? "+" : "-";
  return `${sign}${formatBRL(Math.abs(value))}`;
}
