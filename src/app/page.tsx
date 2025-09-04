// src/app/page.tsx
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen text-center">
      <h1 className="text-4xl font-bold mb-6">Find Your Next Catch</h1>
      <p className="mb-8 text-lg">Browse sportfishing vessels across Southern California</p>

      <Link
        href="/listing"
        className="px-6 py-3 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition"
      >
        View Listings
      </Link>
    </main>
  );
}

return (
  <main className="mx-auto max-w-6xl p-6">
    {/* Hero */}
    <section className="flex flex-col items-center text-center py-16">
      <h1 className="text-4xl font-bold mb-4">Find Your Next Catch</h1>
      <p className="text-lg mb-8">
        Browse sportfishing vessels across Southern California.
      </p>
      <Link
        href="/listing"
        className="px-6 py-3 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition"
      >
        View Listings
      </Link>
    </section>

    {/* Latest vessels */}
    <section className="mt-10">
      <h2 className="text-xl font-semibold mb-4">Latest vessels</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {featured.map((r) => {
          const vesselUrl = toUrl(r.sourceUrl);           // vessel website (same tab)
          const landingUrl = toUrl(r.provider?.website);  // provider website (same tab)
          const internalUrl = `/listing/${r.id}`;         // internal details page

          return (
            <div key={r.id} className="rounded-2xl p-4 shadow border bg-white">
              <h3 className="font-medium">{r.title || "Untitled Vessel"}</h3>
              <p className="text-sm text-gray-500">
                {[r.city, r.state].filter(Boolean).join(", ")}
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                {vesselUrl && (
                  <a href={vesselUrl} className="rounded-lg border px-3 py-1.5 hover:bg-gray-50">
                    View details
                  </a>
                )}
                {landingUrl && (
                  <a href={landingUrl} className="rounded-lg border px-3 py-1.5 hover:bg-gray-50">
                    Visit provider
                  </a>
                )}
                <Link href={internalUrl} className="rounded-lg border px-3 py-1.5 hover:bg-gray-50">
                  More info
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  </main>
);
}
