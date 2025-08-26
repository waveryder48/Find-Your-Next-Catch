import './globals.css';
export const metadata = { title: 'ReelFind — Sportfishing Charters', description: 'Search & compare sportfishing charters.' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="border-b border-white/10 sticky top-0 backdrop-blur bg-black/40">
          <div className="container flex items-center justify-between py-4">
            <a href="/" className="text-xl font-semibold tracking-tight">🎣 ReelFind</a>
            <nav className="flex gap-6 text-sm">
              <a className="opacity-80 hover:opacity-100" href="/search">Explore</a>
              <a className="opacity-80 hover:opacity-100" href="/dashboard">For Captains</a>
            </nav>
          </div>
        </header>
        <main className="container py-8">{children}</main>
        <footer className="container py-10 opacity-70 text-sm">© 2025 ReelFind</footer>
      </body>
    </html>
  );
}