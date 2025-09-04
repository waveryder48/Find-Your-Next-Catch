import Link from "next/link";
import { prisma } from "@/lib/prisma";

const isUrl = (s?: string | null) =>
    !!s && (/^https?:\/\//i.test(s) || (/\.[a-z]{2,}($|[\/?#])/i.test(s) && !/\s/.test(s)));
const toUrl = (s?: string | null) => !isUrl(s) ? null : /^https?:\/\//i.test(s!) ? s! : `https://${s}`;

export const dynamic = "force-dynamic";

export default async function ListingGridPage() {
    const rows = await prisma.listing.findMany({
        take: 50,
        include: { provider: true },
        orderBy: { createdAt: "desc" },
    });

    return (
        <main className="p-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {rows.map((r) => {
                const vesselUrl = toUrl(r.sourceUrl);                   // <-- vessel website (Dataset column D)
                const landingUrl = toUrl(r.provider?.website);           // <-- landing homepage (Dataset column B)
                const internalUrl = `/listing/${r.id}`;                   // optional internal profile

                return (
                    <div key={r.id} className="rounded-2xl p-4 shadow hover:shadow-lg border bg-white">
                        <h3 className="font-semibold text-lg mb-1">{r.title || "Untitled Vessel"}</h3>
                        <p className="text-sm opacity-80">{[r.city, r.state].filter(Boolean).join(", ")}</p>

                        <div className="mt-4 flex flex-wrap gap-3">
                            {/* Now "View details" = VESSEL WEBSITE */}
                            {vesselUrl && (
                                <a
                                    href={vesselUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="rounded-lg border px-3 py-1.5 hover:bg-gray-50"
                                >
                                    View details
                                </a>
                            )}

                            {/* Keep the landing link as "Visit provider" */}
                            {landingUrl && (
                                <a
                                    href={landingUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="rounded-lg border px-3 py-1.5 hover:bg-gray-50"
                                >
                                    Visit provider
                                </a>
                            )}

                            {/* Optional: keep an internal page link with a new label */}
                            <Link href={internalUrl} className="rounded-lg border px-3 py-1.5 hover:bg-gray-50">
                                More info
                            </Link>
                        </div>
                    </div>
                );
            })}
        </main>
    );
}
