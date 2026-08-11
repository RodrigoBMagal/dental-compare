"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

const STORAGE_KEY = "dental-compare-theme";

function getCurrentTheme(): Theme {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "dark") {
    root.setAttribute("data-theme", "dark");
  } else {
    root.removeAttribute("data-theme");
  }
  // Mantém a cor da barra do navegador (mobile) em sintonia com o tema.
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) {
    meta.content = theme === "dark" ? "#161b1a" : "#f6f4f1";
  }
}

export function ThemeToggle() {
  // O valor real só é conhecido no cliente — o <html> já vem com data-theme
  // definido pelo script de layout.tsx (roda antes da hidratação), então lemos
  // dele em vez do localStorage para nunca divergir.
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    setTheme(getCurrentTheme());
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage indisponível (modo privado/SSR) não impede a alternância.
    }
  };

  const nextLabel = theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro";

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggle}
      aria-label={nextLabel}
      title={nextLabel}
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
