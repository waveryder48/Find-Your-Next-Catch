"use client";
import Link from "next/link";
import type { TripsCardDTO } from "@/lib/trips-dto";

function money(cents: number | null | undefined) {
  if (cents == null) return "—";
  return (cents / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
function fmtLocal(iso: string, tz?: string) {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat(undefined, {
      month: "short", day: "numeric",
      hour: "numeric", minute: "2-digit",
      timeZone: tz || undefined,
    }).format(d);
  } catch { return new Date(iso).toLocaleString(); }
}
function availability(load: number | null, spots: number | null, status: string) {
  if (typeof spots === "number" && typeof load === "number") {
    const left = Math.max(spots, 0);
    return left > 0 ? `${left} of ${load} left` : "Sold out";
  }
  if (typeof spots === "number") return spots > 0 ? `${spots} spots left` : "Sold out";
  return status;
}

export default function TripsCard(p: TripsCardDTO) {
  const href = p.vesselSlug ? `/v/${p.vesselSlug}` : `/l/${p.landingSlug}`;

  return (
    <article className="group grid grid-cols-1 sm:grid-cols-[1fr,220px] gap-3 rounded-2xl border p-4 hover:shadow-md transition">
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-2">
          <Link href={href} className="truncate text-lg font-semibold">
            {p.title}
          </Link>
          <div className="shrink-0 text-right text-sm text-gray-600">
            {availability(p.load, p.spotsLeft, p.status)}
          </div>
        </div>

        <div className="mt-1 text-sm text-gray-600 truncate">
          {p.vesselName ? `${p.vesselName} • ` : ""}{p.landingName}
        </div>

        <div className="mt-1 text-sm">
          {fmtLocal(p.departIso, p.timezone)} • {p.timezone}
        </div>

        <div className="mt-2 flex flex-wrap gap-1">
          {p.promoSummary ? (
            <span className="rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs">
              {p.promoSummary}
            </span>
          ) : null}
          {p.flags?.map((f) => (
            <span key={f} className="rounded-full bg-gray-100 border px-2 py-0.5 text-xs">{f}</span>
          ))}
        </div>
      </div>

      <div className="flex items-end justify-between sm:flex-col sm:items-end sm:justify-start">
        <div className="text-right">
          <div className="text-xs text-gray-500">from</div>
          <div className="text-2xl font-semibold">USD {money(p.priceFromCents)}</div>
          {p.priceIncludesFees ? (
            <div className="text-xs text-gray-600">
              Includes fees{p.serviceFeePct != null ? ` (${p.serviceFeePct}% svc)` : ""}
            </div>
          ) : (
            <div className="text-xs text-gray-500">Plus fees/taxes</div>
          )}
        </div>

        <Link href="/trips" className="ml-3 text-xs text-blue-600 hover:underline">
          See all trips
        </Link>
      </div>
    </article>
  );
}

