// src/app/listing/page.tsx
import Link from "next/link";

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

export default async function ListingGridPage() {
    const res = await fetch(`/api/listings?limit=50`, { cache: "no-store" });
    const data = await res.json();
    const rows: any[] = Array.isArray(data.value) ? data.value : [];

    return (
        <main className="p-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {rows.map((r) => {
                const detailsHref = `/listing/${r.id}`;
                const providerRaw = r?.provider?.website || r?.providerWebsite || r?.sourceUrl;
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
