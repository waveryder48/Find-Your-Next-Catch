// src/app/listing/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/prisma";

const isUrl = (s?: string | null) =>
    !!s && (/^https?:\/\//i.test(s) || (/\.[a-z]{2,}($|[\/?#])/i.test(s) && !/\s/.test(s)));
const toUrl = (s?: string | null) =>
    !isUrl(s) ? null : /^https?:\/\//i.test(s!) ? s! : `https://${s}`;

export const revalidate = 60; // ISR safety

export default async function ListingPage() {
    const rows = await prisma.listing.findMany({
        orderBy: { createdAt: "desc" },
        include: { provider: true },
        take: 60,
    });

    return (
        <main className="relative z-10 mx-auto max-w-6xl p-6 bg-transparent">
            {/* Top bar with Back button */}
            <div className="mb-6">
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 rounded-lg border border-black px-4 py-2 bg-white text-black hover:bg-black hover:text-white transition"
                >
                    ← Back
                </Link>
            </div>

            <h1 className="text-2xl font-semibold mb-4">Vessels</h1>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {rows.map((r) => {
                    const vesselUrl = toUrl(r.sourceUrl);
                    const landingUrl = toUrl(r.provider?.website);

                    return (
                        <div
                            key={r.id}
                            className="rounded-2xl p-4 shadow border bg-white/80 backdrop-blur-sm"
                        >
                            <h3 className="font-medium">{r.title || "Untitled Vessel"}</h3>
                            <p className="text-sm text-gray-600">
                                {[r.city, r.state].filter(Boolean).join(", ")}
                            </p>

                            <div className="mt-3 flex flex-wrap gap-3">
                                {vesselUrl && (
                                    <a
                                        href={vesselUrl}
                                        className="rounded-lg border px-3 py-1.5 hover:bg-gray-100"
                                    >
                                        Vessel Information
                                    </a>
                                )}
                                {landingUrl && (
                                    <a
                                        href={landingUrl}
                                        className="rounded-lg border px-3 py-1.5 hover:bg-gray-100"
                                    >
                                        Landing Website
                                    </a>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </main>
    );
}
