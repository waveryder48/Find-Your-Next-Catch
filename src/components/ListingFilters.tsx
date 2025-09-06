"use client";
import { useMemo, useState } from "react";
import { MOCK_SPECIES, MOCK_LOCATIONS } from "@/lib/mock-data";

export type FilterState = {
    q: string;
    species: string | "any";
    location: string | "any";
    maxPrice: number | null;
    minHours: number | null;
};

export function useDefaultFilters(): FilterState {
    return { q: "", species: "any", location: "any", maxPrice: null, minHours: null };
}

export default function ListingFilters({
    onChange
}: {
    onChange: (f: FilterState) => void;
}) {
    const [state, setState] = useState<FilterState>({ q: "", species: "any", location: "any", maxPrice: null, minHours: null });

    function update<K extends keyof FilterState>(k: K, v: FilterState[K]) {
        const next = { ...state, [k]: v };
        setState(next);
        onChange(next);
    }

    const speciesOpts = useMemo(() => ["any", ...MOCK_SPECIES], []);
    const locationOpts = useMemo(() => ["any", ...MOCK_LOCATIONS], []);

    return (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <input
                className="border rounded-xl px-3 py-2 text-sm"
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
                type="number"
                min={50}
                step={10}
                placeholder="Max price ($)"
                className="border rounded-xl px-3 py-2 text-sm"
                value={state.maxPrice ?? ""}
                onChange={(e) => update("maxPrice", e.target.value ? Number(e.target.value) : null)}
            />
            <input
                type="number"
                min={1}
                step={1}
                placeholder="Min hours"
                className="border rounded-xl px-3 py-2 text-sm"
                value={state.minHours ?? ""}
                onChange={(e) => update("minHours", e.target.value ? Number(e.target.value) : null)}
            />
        </div>
    );
}
