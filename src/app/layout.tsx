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
      <body className={`${inter.className} min-h-screen text-slate-900`}>
        {/* Fixed background image layer (persists on scroll & across pages) */}
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 -z-10 bg-cover bg-top"
          style={{
            backgroundImage: "url('/bg-ocean.jpg')",
            backgroundAttachment: "fixed",
          }}
        />
        {/* Optional subtle tint to improve foreground readability */}
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 -z-10"
          style={{
            background:
              "linear-gradient(to bottom, rgba(255,255,255,0.0), rgba(255,255,255,0.05))",
          }}
        />

        {/* App content */}
        {children}
      </body>
    </html>
  );
}
