// src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Find Your Next Catch",
  description: "Southern California Sportfishing Charter Aggregator",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className="min-h-screen bg-fixed bg-cover bg-top text-slate-900"
        style={{ backgroundImage: "url('/bg-ocean.png')" }}
      >
        {children}
      </body>
    </html>
  );
}
