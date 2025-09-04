import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Find Your Next Catch",
  description: "Southern California sportfishing charter aggregator",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className="min-h-screen bg-fixed bg-cover bg-top text-slate-900"
        style={{ backgroundImage: "url('/bg-ocean.png')" }}
      >
        {/* Overlay for readability */}
        <div className="min-h-screen bg-white/40">
          {children}
        </div>
      </body>
    </html>
  );
}
