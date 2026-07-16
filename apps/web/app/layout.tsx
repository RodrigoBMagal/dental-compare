import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dental Compare",
  description: "Comparador de preços de produtos odontológicos",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
