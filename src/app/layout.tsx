import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ada — Tutora Socrática Neural Nexus",
  description:
    "Agente Virtual de Tutoría Socrática para programación STEM. Proyecto de investigación PF-3311 — UCR.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <body className="min-h-screen bg-gray-950 text-white antialiased">
        {children}
      </body>
    </html>
  );
}
