// app/search/page.tsx
type SP = Record<string, string | string[] | undefined>;

async function fetchResults(sp: SP) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(sp ?? {})) {
        if (typeof v === "string" && v.length) qs.set(k, v);
    }
    const base = process.env.NEXT_PUBLIC_BASE_URL ?? "";
    const url =
        (base ? `${base.replace(/\/$/, "")}` : "") +
        `/api/search` +
        (qs.size ? `?${qs.toString()}` : "");

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch");
    const json = await res.json();
    return json.data as any[];
}

export default async function SearchPage({
    // Next 15: searchParams is a Promise
    searchParams,
}: {
    searchParams: Promise<SP>;
}) {
    const sp = await searchParams;
    const results = await fetchResults(sp);

    return (
        <main className="mx-auto max-w-6xl p-4">
            <h1 className="mb-4 text-2xl font-semibold">Search</h1>
            {sp?.q ? (
                <p className="mb-3 text-sm text-gray-600">
                    Query: <span className="font-medium">{String(sp.q)}</span>
                </p>
            ) : null}

            <pre className="rounded-lg bg-gray-50 p-3 text-xs text-gray-800 overflow-x-auto">
                {JSON.stringify(results, null, 2)}
            </pre>
            {/* Replace the <pre> above with your own cards/list when ready */}
        </main>
    );
}
