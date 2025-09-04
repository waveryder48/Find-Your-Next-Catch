import "./globals.css";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Find Your Next Catch",
    description: "Browse Southern California sportfishing charters.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body className="min-h-screen bg-gradient-to-b from-sky-50 to-white text-gray-900 antialiased">
                <header className="border-b bg-white/70 backdrop-blur">
                    <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-6">
                        <Link href="/" className="font-semibold">FindYourNextCatch</Link>
                        <nav className="flex items-center gap-4 text-sm">
                            <Link href="/">Home</Link>
                            <Link href="/listing">Listings</Link>
                        </nav>
                    </div>
                </header>
                <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
            </body>
        </html>
    );
}
