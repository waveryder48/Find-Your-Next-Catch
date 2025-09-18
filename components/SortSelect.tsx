"use client";
import { useRouter, useSearchParams } from "next/navigation";

export default function SortSelect({ options }:{ options: { value: string; label: string }[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const current = params.get("sort") ?? "date_desc";

  const setSort = (v: string) => {
    const usp = new URLSearchParams(Array.from(params.entries()));
    usp.set("sort", v);
    usp.set("p", "1"); // reset page on sort change
    router.push(`?${usp.toString()}`);
  };

  return (
    <select className="rounded-xl border px-3 py-2" value={current} onChange={(e) => setSort(e.target.value)}>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}
