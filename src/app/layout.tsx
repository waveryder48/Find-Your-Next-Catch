// src/app/layout.tsx
import "./globals.css";
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gradient-to-b from-sky-50 to-white">
        <header className="sticky top-0 z-10 backdrop-blur bg-white/70 border-b">
          <div className="mx-auto max-w-6xl px-4 h-14 flex items-center gap-3">
            <a href="/" className="font-bold">FindYourNextCatch</a>
            <form action="/search" className="ml-auto flex gap-2">
              <input name="q" placeholder="Search charters, cities..." className="rounded-xl border px-3 py-1.5" />
              <button className="rounded-xl border px-3 py-1.5 hover:bg-gray-50">Search</button>
            </form>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
