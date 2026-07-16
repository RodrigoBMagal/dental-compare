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
      style={{ display: "flex", gap: 4, alignItems: "center" }}
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
        style={{ width: 140, fontSize: "0.8rem", padding: "0.2rem 0.4rem" }}
      />
      <input
        type="number"
        step="0.01"
        required
        value={targetPrice}
        onChange={(e) => setTargetPrice(e.target.value)}
        style={{ width: 70, fontSize: "0.8rem", padding: "0.2rem 0.4rem" }}
      />
      <button className="alert-btn" type="submit" disabled={status === "saving"}>
        {status === "saving" ? "..." : "Salvar"}
      </button>
      {status === "error" && <span style={{ color: "crimson", fontSize: "0.75rem" }}>Erro</span>}
    </form>
  );
}
