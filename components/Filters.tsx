"use client";
import { useRouter, useSearchParams } from "next/navigation";

export type Option = { id: string; name: string };

export default function Filters({ landings, vessels }: { landings: Option[]; vessels: Option[] }) {
  const router = useRouter();
  const params = useSearchParams();

  const setParam = (k: string, v?: string) => {
    const usp = new URLSearchParams(Array.from(params.entries()));
    if (v && v.length) usp.set(k, v); else usp.delete(k);
    if (k !== "p") usp.set("p", "1"); // reset page on filter change
    router.push(`?${usp.toString()}`);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-2">
      <select
        className="rounded-xl border px-3 py-2"
        value={params.get("landingId") ?? ""}
        onChange={(e) => setParam("landingId", e.target.value || undefined)}
      >
        <option value="">All Landings</option>
        {landings.map((l) => (
          <option key={l.id} value={l.id}>{l.name}</option>
        ))}
      </select>

      <select
        className="rounded-xl border px-3 py-2"
        value={params.get("vesselId") ?? ""}
        onChange={(e) => setParam("vesselId", e.target.value || undefined)}
      >
        <option value="">All Vessels</option>
        {vessels.map((v) => (
          <option key={v.id} value={v.id}>{v.name}</option>
        ))}
      </select>

      <input
        type="number"
        min={0}
        step={10}
        placeholder="Min $"
        className="rounded-xl border px-3 py-2"
        defaultValue={params.get("minPrice") ?? ""}
        onBlur={(e) => setParam("minPrice", e.target.value || undefined)}
      />
      <input
        type="number"
        min={0}
        step={10}
        placeholder="Max $"
        className="rounded-xl border px-3 py-2"
        defaultValue={params.get("maxPrice") ?? ""}
        onBlur={(e) => setParam("maxPrice", e.target.value || undefined)}
      />

      <input
        type="date"
        className="rounded-xl border px-3 py-2"
        defaultValue={params.get("startDate") ?? ""}
        onBlur={(e) => setParam("startDate", e.target.value || undefined)}
      />
      <input
        type="date"
        className="rounded-xl border px-3 py-2"
        defaultValue={params.get("endDate") ?? ""}
        onBlur={(e) => setParam("endDate", e.target.value || undefined)}
      />
    </div>
  );
}

