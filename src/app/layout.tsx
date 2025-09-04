// src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Find Your Next Catch",
  description: "Sportfishing vessels across Southern California",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} min-h-screen text-slate-900 bg-transparent`}>
        {/* Fixed background layer (no negative z-index) */}
        <div
          aria-hidden
          className="fixed inset-0 z-0 bg-cover bg-top"
          style={{
            backgroundImage: "url('/bg-ocean.jpg')",
            backgroundAttachment: "fixed",
          }}
        />

        {/* Optional subtle tint for readability */}
        <div
          aria-hidden
          className="fixed inset-0 z-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(255,255,255,0.0), rgba(255,255,255,0.05))",
          }}
        />

        {/* App content sits above the background */}
        <div className="relative z-10">
          {children}
        </div>
      </body>
    </html>
  );
}
