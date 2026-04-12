import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
  title: "Codex Oracle — Universal Transmissions",
  description: "150 pages of xenolinguistic art, transcendent geometry, and hyperdimensional transmissions — decoded through five data layers.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function OracleV2Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
