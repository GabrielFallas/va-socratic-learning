import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sonic Code — Tutor Socrático de Programación",
  description:
    "Sonic the Hedgehog te guía a través del aprendizaje socrático de programación. ¡Gotta go fast! Proyecto de investigación PF-3311 — UCR I Semestre 2026.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link
          href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen antialiased" style={{ background: "#0a0a1a", color: "#ffffff" }}>
        {children}
      </body>
    </html>
  );
}
