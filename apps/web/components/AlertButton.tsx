"use client";

import { useState } from "react";

export function AlertButton({
  storeProductId,
  currentPrice,
}: {
  storeProductId: string;
  currentPrice: number;
}) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [targetPrice, setTargetPrice] = useState(currentPrice.toFixed(2));
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");

  if (status === "done") {
    return <span>✅ Alerta criado</span>;
  }

  if (!open) {
    return (
      <button className="alert-btn" onClick={() => setOpen(true)}>
        Avisar quando baixar
      </button>
    );
  }

  return (
    <form
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 6,
        alignItems: "center",
        justifyContent: "flex-end",
        width: "100%",
      }}
      onSubmit={async (e) => {
        e.preventDefault();
        setStatus("saving");
        try {
          const res = await fetch("/api/alerts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, storeProductId, targetPrice: Number(targetPrice) }),
          });
          setStatus(res.ok ? "done" : "error");
        } catch {
          setStatus("error");
        }
      }}
    >
      <input
        type="email"
        required
        placeholder="seu@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{
          flex: "1 1 130px",
          minWidth: 110,
          fontSize: "0.85rem",
          padding: "0.5rem 0.6rem",
          border: "1px solid var(--border)",
          borderRadius: 8,
        }}
      />
      <input
        type="number"
        step="0.01"
        required
        value={targetPrice}
        onChange={(e) => setTargetPrice(e.target.value)}
        style={{
          width: 80,
          fontSize: "0.85rem",
          padding: "0.5rem 0.6rem",
          border: "1px solid var(--border)",
          borderRadius: 8,
        }}
      />
      <button className="alert-btn" type="submit" disabled={status === "saving"}>
        {status === "saving" ? "..." : "Salvar"}
      </button>
      {status === "error" && (
        <span style={{ color: "var(--danger)", fontSize: "0.75rem" }}>Erro</span>
      )}
    </form>
  );
}
