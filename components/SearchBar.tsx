"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, FormEvent } from "react";

export default function SearchBar({ placeholder = "Search offers, vessels, landings…" }:{ placeholder?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [value, setValue] = useState("");

  // keep input in sync with current URL's q param
  useEffect(() => { setValue(params.get("q") ?? ""); }, [params]);

  function submit(e?: FormEvent) {
    e?.preventDefault();
    const usp = new URLSearchParams(Array.from(params.entries()));
    const v = value.trim();
    if (v) usp.set("q", v); else usp.delete("q");
    usp.set("p", "1"); // reset page when searching
    router.push(`?${usp.toString()}`);
  }

  return (
    <form onSubmit={submit} className="flex gap-2">
      <input
        className="rounded-xl border px-3 py-2 w-72"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
      />
      <button type="submit" className="rounded-xl border px-3 py-2">Search</button>
    </form>
  );
}
