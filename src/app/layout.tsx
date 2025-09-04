// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Find Your Next Catch",
  description: "Southern California sportfishing vessel listings",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen text-slate-900 relative">
        {/* Background + overlay */}
        <div
          className="fixed inset-0 bg-cover bg-center bg-fixed"
          style={{ backgroundImage: "url('/bg-ocean.jpg')" }}
        >
          {/* Overlay tint */}
          <div className="absolute inset-0 bg-white/70"></div>
        </div>

        {/* Content goes above overlay */}
        <main className="relative z-10">{children}</main>
      </body>
    </html>
  );
}
