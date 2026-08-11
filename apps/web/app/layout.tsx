import type { Metadata, Viewport } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dental Compare",
  description: "Comparador de preços de produtos odontológicos",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f6f4f1",
};

// Roda antes da hidratação (no <head>, durante o parse do HTML) para aplicar o
// tema salvo sem "flash" de cor. Sempre cai para o claro se não houver nada salvo.
const themeInitScript = `(function(){try{var t=localStorage.getItem("dental-compare-theme");if(!t){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}if(t==="dark"){document.documentElement.setAttribute("data-theme","dark");}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
