// app/trips/page.tsx
import TripFilters from "@/components/TripFilters";
import TripCard from "@/components/TripCard";

// simple FRN parser to pull price/spots/load out of title (same logic as in TripCard)
function parseFromTitle(title: string) {
  const priceMatch = title.match(/\$\s*([\d,]+(?:\.\d{2})?)/);
  const price = priceMatch ? Number(priceMatch[1].replace(/,/g, "")) : undefined;
  let load: number | undefined;
  let spots: number | undefined;
  const tailNums = title.match(/(\d+)\s*\$\s*[\d,]+(?:\.\d{2})?\s*(\d+)/);
  if (tailNums) { load = Number(tailNums[1]); spots = Number(tailNums[2]); }
  return { price, load, spots };
}

function toURLSearchParams(obj: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    if (Array.isArray(v)) v.forEach(x => params.append(k, x));
    else params.set(k, v);
  }
  return params;
}

type ApiTrip = {
  id: string;
  title: string;
  sourceUrl?: string | null;
  url?: string | null;
  depart_local?: string;
  return_local?: string | null;
  landing?: { id: string; name: string };
};

export default async function TripsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const qs = toURLSearchParams(sp);
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "";
  const res = await fetch(`${base}/api/trips?${qs.toString()}`, { cache: "no-store" });
  const json = await res.json();
  let trips: ApiTrip[] = Array.isArray(json?.data) ? json.data : [];

  const openOnly = (sp.openOnly === "1");
  const sort = (sp.sort as string) ?? "depart_asc";

  // client-side filter for “open spots”
  if (openOnly) {
    trips = trips.filter(t => {
      const { load, spots } = parseFromTitle(t.title ?? "");
      return load && spots != null && spots > 0;
    });
  }

  // sort
  trips = [...trips].sort((a, b) => {
    if (sort === "depart_desc") {
      return new Date(b.depart_local ?? 0).getTime() - new Date(a.depart_local ?? 0).getTime();
    }
    if (sort === "price_asc" || sort === "price_desc") {
      const pa = parseFromTitle(a.title ?? "").price ?? Number.POSITIVE_INFINITY;
      const pb = parseFromTitle(b.title ?? "").price ?? Number.POSITIVE_INFINITY;
      return sort === "price_asc" ? pa - pb : pb - pa;
    }
    // default depart_asc
    return new Date(a.depart_local ?? 0).getTime() - new Date(b.depart_local ?? 0).getTime();
  });

  return (
    <div className="max-w-5xl mx-auto p-4">
      <TripFilters />
      <div className="space-y-3">
        {trips.length === 0 && <p className="text-gray-500">No trips found.</p>}
        {trips.map(trip => <TripCard key={trip.id} trip={trip} />)}
      </div>
    </div>
  );
}
