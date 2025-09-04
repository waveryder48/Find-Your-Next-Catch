// src/app/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/prisma";

// helpers
const isUrl = (s?: string | null) =>
  !!s && (/^https?:\/\//i.test(s) || (/\.[a-z]{2,}($|[\/?#])/i.test(s) && !/\s/.test(s)));
const toUrl = (s?: string | null) =>
  !isUrl(s) ? null : /^https?:\/\//i.test(s!) ? s! : `https://${s}`;

export default async function HomePage() {
  const featured = await prisma.listing.findMany({
    take: 6,
    include: { provider: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="mx-auto max-w-6xl p-6">
      {/* Hero */}
      <section className="flex flex-col items-center text-center py-16">
        <h1 className="text-4xl font-bold mb-4">Find Your Next Catch</h1>
        <p className="text-lg mb-8">
          Browse sportfishing vessels across Southern California.
        </p>

        {/* Matches color scheme: blue button with white text */}
        <Link
          href="/listing"
          className="px-6 py-3 rounded-lg shadow bg-blue-600 text-white hover:bg-blue-700 transition"
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
            return (
              <div key={r.id} className="rounded-2xl p-4 shadow border bg-white">
                <h3 className="font-medium">{r.title || "Untitled Vessel"}</h3>
                <p className="text-sm text-gray-500">
                  {[r.city, r.state].filter(Boolean).join(", ")}
                </p>

                <div className="mt-3 flex flex-wrap gap-3">
                  {vesselUrl && (
                    <a href={vesselUrl} className="rounded-lg border px-3 py-1.5 hover:bg-gray-50">
                      Vessel Information
                    </a>
                  )}
                  {landingUrl && (
                    <a href={landingUrl} className="rounded-lg border px-3 py-1.5 hover:bg-gray-50">
                      Landing Website
                    </a>
                  )}
                  {/* "More info" removed per request */}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
