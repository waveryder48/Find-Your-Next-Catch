// src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Find Your Next Catch",
  description: "Browse sportfishing vessels across Southern California",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className="min-h-screen bg-fixed bg-top bg-cover text-slate-900"
        style={{
          backgroundImage: "url('/bg-ocean.png')", // <-- file must be at /public/bg-ocean.png
          backgroundRepeat: "no-repeat",
        }}
      >
        {/* optional subtle overlay to keep text readable */}
        <div className="min-h-screen bg-white/0">{children}</div>
      </body>
    </html>
  );
}
