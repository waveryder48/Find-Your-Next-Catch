// components/TripFilters.tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Landing = { id: string; name: string };

export default function TripFilters() {
    const router = useRouter();
    const sp = useSearchParams();

    const [landings, setLandings] = useState<Landing[]>([]);
    const [landingId, setLandingId] = useState(sp.get("landingId") ?? "");
    const [q, setQ] = useState(sp.get("q") ?? "");
    const [dateFrom, setDateFrom] = useState(sp.get("dateFrom") ?? "");
    const [dateTo, setDateTo] = useState(sp.get("dateTo") ?? "");
    const [openOnly, setOpenOnly] = useState(sp.get("openOnly") === "1"); // NEW
    const [sort, setSort] = useState(sp.get("sort") ?? "depart_asc");     // NEW

    useEffect(() => {
        (async () => {
            const res = await fetch("/api/landings", { cache: "no-store" });
            const json = await res.json();
            setLandings(json.data ?? []);
        })();
    }, []);

    const apply = () => {
        const params = new URLSearchParams();
        if (landingId) params.set("landingId", landingId);
        if (q) params.set("q", q);
        if (dateFrom) params.set("dateFrom", dateFrom);
        if (dateTo) params.set("dateTo", dateTo);
        if (openOnly) params.set("openOnly", "1");            // NEW
        if (sort && sort !== "depart_asc") params.set("sort", sort); // NEW
        params.set("page", "1");
        router.replace(`/trips?${params.toString()}`);
    };

    const reset = () => {
        setLandingId(""); setQ(""); setDateFrom(""); setDateTo("");
        setOpenOnly(false); setSort("depart_asc");
        router.replace("/trips");
    };

    return (
        <div className="mb-4 grid grid-cols-1 md:grid-cols-7 gap-3 p-3 border rounded-xl">
            <select className="border rounded-lg px-3 py-2 col-span-2" value={landingId} onChange={e => setLandingId(e.target.value)}>
                <option value="">All landings</option>
                {landings.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>

            <input className="border rounded-lg px-3 py-2" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            <input className="border rounded-lg px-3 py-2" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            <input className="border rounded-lg px-3 py-2" placeholder="Search (title)" value={q} onChange={e => setQ(e.target.value)} />

            <select className="border rounded-lg px-3 py-2" value={sort} onChange={e => setSort(e.target.value)}>
                <option value="depart_asc">Depart ↑</option>
                <option value="depart_desc">Depart ↓</option>
                <option value="price_asc">Price ↑ (client)</option>
                <option value="price_desc">Price ↓ (client)</option>
            </select>

            <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={openOnly} onChange={e => setOpenOnly(e.target.checked)} />
                Only open spots
            </label>

            <div className="flex gap-2 col-span-2 md:col-span-1">
                <button onClick={apply} className="border rounded-lg px-3 py-2 w-full">Apply</button>
                <button onClick={reset} className="border rounded-lg px-3 py-2 w-full">Reset</button>
            </div>
        </div>
    );
}
