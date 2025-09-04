// src/app/listing/page.tsx
import BackButton from "@/components/BackButton";
import { prisma } from "@/lib/prisma";

const isUrl = (s?: string | null) =>
    !!s && (/^https?:\/\//i.test(s) || (/\.[a-z]{2,}($|[\/?#])/i.test(s) && !/\s/.test(s)));
const toUrl = (s?: string | null) =>
    !isUrl(s) ? null : /^https?:\/\//i.test(s!) ? s! : `https://${s}`;

export default async function ListingPage() {
    const listings = await prisma.listing.findMany({
        include: { provider: true },
        orderBy: { createdAt: "desc" },
    });

    return (
        <main className="mx-auto max-w-6xl p-6">
            {/* Back button */}
            <div className="mb-6">
                <BackButton />
            </div>

            <h1 className="text-2xl font-bold mb-6">All Vessels</h1>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {listings.map((r) => {
                    const vesselUrl = toUrl(r.sourceUrl); // vessel website
                    const landingUrl = toUrl(r.provider?.website); // landing website

                    return (
                        <div
                            key={r.id}
                            className="rounded-2xl p-4 shadow border bg-white"
                        >
                            <h3 className="font-medium">{r.title || "Untitled Vessel"}</h3>
                            <p className="text-sm text-gray-500">
                                {[r.city, r.state].filter(Boolean).join(", ")}
                            </p>

                            <div className="mt-3 flex flex-wrap gap-3">
                                {vesselUrl && (
                                    <a
                                        href={vesselUrl}
                                        className="rounded-lg border px-3 py-1.5 hover:bg-gray-50"
                                    >
                                        Vessel Information
                                    </a>
                                )}
                                {landingUrl && (
                                    <a
                                        href={landingUrl}
                                        className="rounded-lg border px-3 py-1.5 hover:bg-gray-50"
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
