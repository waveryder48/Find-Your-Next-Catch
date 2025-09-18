import Link from "next/link";
import Price from "./Price";

type Row = {
  id: string;
  vesselId: string; vesselName: string; vesselUrl: string | null; vesselImageUrl: string | null;
  landingId: string; landingName: string; landingUrl: string | null;
  title: string; priceCents: number | null;
  departureDate: string | null; returnsAt: string | null;
  lengthLabel: string | null; loadLabel: string | null;
  summary: string | null; spotsOpen: number | null; capacity: number | null;
  includeMeals: boolean | null; includePermits: boolean | null;
  sourceUrl: string;
};

function OccupancyBadge({ open, cap }: { open: number | null; cap: number | null }) {
  if (open == null || cap == null || cap <= 0) return null;
  const filled = 1 - open / cap; // 0..1
  const cls = filled < 0.5 ? "bg-green-100 text-green-700 border-green-200"
            : filled < 0.8 ? "bg-amber-100 text-amber-700 border-amber-200"
            : "bg-red-100 text-red-700 border-red-200";
  return (
    <span className={`ml-auto rounded-full border px-2 py-0.5 text-xs ${cls}`}>
      {open}/{cap} open
    </span>
  );
}

export default function OfferCard({ o }: { o: Row }) {
  const img = o.vesselImageUrl || "https://placehold.co/800x450?text=Vessel";
  const dep = o.departureDate ? new Date(o.departureDate) : null;
  const ret = o.returnsAt ? new Date(o.returnsAt) : null;

  return (
    <li className="rounded-2xl overflow-hidden border hover:shadow-sm bg-white">
      <div className="aspect-video overflow-hidden bg-gray-50">
        {/* using plain img to avoid Next image config churn */}
        <a href={o.sourceUrl} target="_blank" rel="noreferrer">
          <img src={img} alt={o.vesselName} className="w-full h-full object-cover" />
        </a>
      </div>

      <div className="p-4 space-y-2">
        <div className="flex items-start gap-2">
          <div className="font-semibold text-lg flex-1">{o.title}</div>
          <OccupancyBadge open={o.spotsOpen} cap={o.capacity} />
        </div>

        <div className="flex items-center justify-between text-sm text-gray-700">
          <div className="flex flex-col">
            <Link href={`/landings/${o.landingId}`} className="hover:underline">{o.landingName}</Link>
            {o.vesselUrl ? (
              <a href={o.vesselUrl} target="_blank" className="hover:underline">{o.vesselName}</a>
            ) : (
              <span className="text-gray-600">{o.vesselName}</span>
            )}
          </div>
          <div className="text-right"><Price cents={o.priceCents ?? undefined} /></div>
        </div>

        <div className="text-sm text-gray-600">
          <div className="flex flex-wrap items-center gap-2">
            {o.lengthLabel && <span className="rounded-xl bg-gray-100 px-2 py-0.5">{o.lengthLabel}</span>}
            {o.loadLabel && <span className="rounded-xl bg-gray-100 px-2 py-0.5">{o.loadLabel}</span>}
            {o.includeMeals != null && <span className="rounded-xl bg-gray-100 px-2 py-0.5">{o.includeMeals ? "Meals Included" : "Meals Extra"}</span>}
            {o.includePermits != null && <span className="rounded-xl bg-gray-100 px-2 py-0.5">{o.includePermits ? "Permits Included" : "Permits Extra"}</span>}
          </div>
          <div className="mt-1">
            {dep && <span>Departs: {dep.toLocaleString()}</span>}
            {ret && <span className="ml-3">Returns: {ret.toLocaleString()}</span>}
          </div>
        </div>

        {o.summary && <p className="text-sm text-gray-700 line-clamp-3">{o.summary}</p>}

        <div className="text-xs text-gray-500 break-all">
          <a href={o.sourceUrl} target="_blank" className="hover:underline">Source →</a>
        </div>
      </div>
    </li>
  );
}
