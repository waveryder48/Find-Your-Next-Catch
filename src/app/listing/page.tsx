import Link from "next/link";
import { prisma } from "@/lib/prisma";

function isProbablyUrl(raw?: string | null) {
    if (!raw) return false;
    const s = String(raw).trim();
    if (!/^https?:\/\//i.test(s) && /\s/.test(s)) return false;
    if (/\.[a-z]{2,}($|[\/?#])/i.test(s)) return true;
    return /^https?:\/\//i.test(s);
}
function toExternalUrlOrNull(raw?: string | null) {
    if (!raw) return null;
    const s = String(raw).trim();
    if (!isProbablyUrl(s)) return null;
    return /^https?:\/\//i.test(s) ? s : `https://${s}`;
}
function googleSearchUrl(parts: (string | null | undefined)[]) {
    const q = parts.filter(Boolean).join(" ");
    return `https://www.google.com/search?q=${encodeURIComponent(q)}`;
}

export const dynamic = "force-dynamic"; // don't cache the page at build time

export default async function ListingGridPage() {
    let rows: any[] = [];
    try {
        rows = await prisma.listing.findMany({
            take: 50,
            include: { provider: true },
            orderBy: { createdAt: "desc" },
        });
    } catch (err) {
        console.error("Error loading listings:", err);
        // Show a tiny fallback so the page doesn't hard-crash
        return (
            <main className="p-6">
                <p>Sorry, we couldn’t load listings right now.</p>
            </main>
        );
    }

    return (
        <main className="p-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {rows.map((r) => {
                const detailsHref = `/listing/${r.id}`;
                const providerRaw = r?.provider?.website || r?.sourceUrl;
                const providerUrl = toExternalUrlOrNull(providerRaw);
                const searchUrl = googleSearchUrl([r?.title, r?.provider?.name, r?.city, r?.state, "fishing charter"]);

                return (
                    <div key={r.id} className="rounded-2xl p-4 shadow hover:shadow-lg border bg-white">
                        <h3 className="font-semibold text-lg mb-1">{r?.title || "Untitled Vessel"}</h3>
                        <p className="text-sm opacity-80">{[r?.city, r?.state].filter(Boolean).join(", ")}</p>

                        <div className="mt-4 flex flex-wrap gap-3">
                            <Link href={detailsHref} className="rounded-lg border px-3 py-1.5 hover:bg-gray-50">
                                View details
                            </Link>

                            {providerUrl ? (
                                <a href={providerUrl} target="_blank" rel="noopener noreferrer" className="rounded-lg border px-3 py-1.5 hover:bg-gray-50">
                                    Visit provider
                                </a>
                            ) : (
                                <a href={searchUrl} target="_blank" rel="noopener noreferrer" className="rounded-lg border px-3 py-1.5 hover:bg-gray-50">
                                    Search provider
                                </a>
                            )}
                        </div>
                    </div>
                );
            })}
        </main>
    );
}
