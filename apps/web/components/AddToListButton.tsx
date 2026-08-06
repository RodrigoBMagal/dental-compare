"use client";

import { useState } from "react";
import Link from "next/link";

export function AddToListButton({
  storeProductId,
  isLoggedIn,
}: {
  storeProductId: string;
  isLoggedIn: boolean;
}) {
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  if (!isLoggedIn) {
    return (
      <Link className="alert-btn" href="/login">
        + lista
      </Link>
    );
  }

  if (status === "done") {
    return <span className="added-label">✓ na lista</span>;
  }

  return (
    <button
      className="alert-btn"
      disabled={status === "saving"}
      title={message ?? undefined}
      onClick={async () => {
        setStatus("saving");
        setMessage(null);
        try {
          const res = await fetch("/api/list", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ storeProductId, quantity: 1 }),
          });
          if (res.ok) {
            setStatus("done");
          } else {
            const data = await res.json().catch(() => null);
            setMessage(data?.error ?? "Erro ao adicionar.");
            setStatus("error");
          }
        } catch {
          setMessage("Sem conexão.");
          setStatus("error");
        }
      }}
    >
      {status === "saving" ? "..." : status === "error" ? "tentar de novo" : "+ lista"}
    </button>
  );
}
