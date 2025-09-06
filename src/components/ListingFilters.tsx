"use client";
import { useMemo, useState } from "react";
import { MOCK_SPECIES, MOCK_LOCATIONS } from "@/lib/mock-data";
import { useGeolocation } from "@/lib/useGeolocation";

export type FilterState = {
    q: string;
    species: string | "any";
    location: string | "any";
    maxPrice: number | null;
    minHours: number | null;
    maxDistanceMi: number | null; // NEW
    userLat?: number | null;      // NEW
    userLng?: number | null;      // NEW
    sort: "relevance" | "price-asc" | "price-desc" | "duration-asc" | "duration-desc" | "distance-asc";
};

export function useDefaultFilters(): FilterState {
    return { q: "", species: "any", location: "any", maxPrice: null, minHours: null, maxDistanceMi: null, sort: "relevance" };
}

export default function ListingFilters({ onChange }: { onChange: (f: FilterState) => void; }) {
    const [open, setOpen] = useState(true);
    const [state, setState] = useState<FilterState>(useDefaultFilters());
    const { pos, loading, error, request } = useGeolocation();

    function update<K extends keyof FilterState>(k: K, v: FilterState[K]) {
        const next = { ...state, [k]: v };
        setState(next);
        onChange(next);
    }

    // Sync geolocation into filters when it arrives
    useMemo(() => {
        if (pos) {
            const next = { ...state, userLat: pos.lat, userLng: pos.lng };
            setState(next);
            onChange(next);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pos?.lat, pos?.lng]);

    const speciesOpts = useMemo(() => ["any", ...MOCK_SPECIES], []);
    const locationOpts = useMemo(() => ["any", ...MOCK_LOCATIONS], []);

    return (
        <div className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b">
            <div className="mx-auto max-w-6xl p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm font-medium">Filters</div>
                    <div className="flex items-center gap-2">
                        <select
                            className="border rounded-xl px-3 py-2 text-sm"
                            value={state.sort}
                            onChange={(e) => update("sort", e.target.value as FilterState["sort"])}
                            title="Sort"
                        >
                            <option value="relevance">Sort: Relevance</option>
                            <option value="price-asc">Sort: Price ↑</option>
                            <option value="price-desc">Sort: Price ↓</option>
                            <option value="duration-asc">Sort: Duration ↑</option>
                            <option value="duration-desc">Sort: Duration ↓</option>
                            <option value="distance-asc">Sort: Distance ↑</option>
                        </select>

                        <button className="border rounded-xl px-3 py-2 text-sm" onClick={() => setOpen((o) => !o)}>
                            {open ? "Hide" : "Show"} filters
                        </button>
                    </div>
                </div>

                {open && (
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-6 gap-3">
                        <input
                            className="border rounded-xl px-3 py-2 text-sm md:col-span-2"
                            placeholder="Search boat, captain, species…"
                            value={state.q}
                            onChange={(e) => update("q", e.target.value)}
                        />
                        <select className="border rounded-xl px-3 py-2 text-sm" value={state.species} onChange={(e) => update("species", e.target.value as any)}>
                            {speciesOpts.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <select className="border rounded-xl px-3 py-2 text-sm" value={state.location} onChange={(e) => update("location", e.target.value as any)}>
                            {locationOpts.map((l) => <option key={l} value={l}>{l}</option>)}
                        </select>
                        <input
                            type="number" min={50} step={10}
                            placeholder="Max price ($)"
                            className="border rounded-xl px-3 py-2 text-sm"
                            value={state.maxPrice ?? ""}
                            onChange={(e) => update("maxPrice", e.target.value ? Number(e.target.value) : null)}
                        />
                        <input
                            type="number" min={1} step={1}
                            placeholder="Min hours"
                            className="border rounded-xl px-3 py-2 text-sm"
                            value={state.minHours ?? ""}
                            onChange={(e) => update("minHours", e.target.value ? Number(e.target.value) : null)}
                        />
                        <div className="md:col-span-2 flex items-center gap-2">
                            <input
                                type="number" min={1} step={1}
                                placeholder="Max distance (mi)"
                                className="border rounded-xl px-3 py-2 text-sm w-full"
                                value={state.maxDistanceMi ?? ""}
                                onChange={(e) => update("maxDistanceMi", e.target.value ? Number(e.target.value) : null)}
                            />
                            <button
                                type="button"
                                className="border rounded-xl px-3 py-2 text-sm whitespace-nowrap"
                                onClick={request}
                                disabled={loading}
                                title={error || "Use my location"}
                            >
                                {loading ? "Locating…" : "Use my location"}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
