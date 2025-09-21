import './globals.css';
import Link from 'next/link';
import type { ReactNode } from 'react';


export default function RootLayout({ children }: { children: ReactNode }) {
    return (
        <html lang="en">
            <body className="min-h-dvh">
                <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
                    <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
                        <Link href="/" className="font-bold text-xl">FYNC</Link>
                        <nav className="flex gap-4 text-sm">
                            <Link href="/landings" className="hover:underline">Landings</Link>
                            <Link href="/trips" className="hover:underline">Trips</Link>
                        </nav>
                    </div>
                </header>
                <main className="mx-auto max-w-6xl px-4 py-6 space-y-4">
                    {children}
                </main>
            </body>
        </html>
    );
}
