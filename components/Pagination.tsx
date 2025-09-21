"use client";
import { useSearchParams, useRouter } from "next/navigation";

export default function Pagination({ totalPages }: { totalPages: number }) {
  const router = useRouter();
  const params = useSearchParams();
  const page = Math.max(1, Number(params.get("p") ?? "1"));

  const setPage = (p: number) => {
    const usp = new URLSearchParams(Array.from(params.entries()));
    usp.set("p", String(p));
    router.push(`?${usp.toString()}`);
  };

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center gap-2">
      <button
        className="rounded-xl border px-3 py-2 disabled:opacity-50"
        disabled={page <= 1}
        onClick={() => setPage(page - 1)}
      >
        Prev
      </button>
      <span className="text-sm">Page {page} of {totalPages}</span>
      <button
        className="rounded-xl border px-3 py-2 disabled:opacity-50"
        disabled={page >= totalPages}
        onClick={() => setPage(page + 1)}
      >
        Next
      </button>
    </div>
  );
}

