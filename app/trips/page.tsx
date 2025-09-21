// app/trips/page.tsx

import TripCard from "@/components/TripCard";

type Trip = {
  id: string;
  title?: string;
  depart_local?: string;
  return_local?: string;
  spots?: number;
  load?: number;
  notes?: string;
  passport_req?: boolean;
  priceIncludesFees?: boolean;
  vesselName?: string;
  landing?: {
    name?: string;
    city?: string;
    state?: string;
  };
};

export default async function TripsPage() {
  // Make sure the fetch uses the full base URL if API route is external
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "";
  const res = await fetch(`${base}/api/trips`, { cache: "no-store" });
  const json = await res.json();

  const trips = Array.isArray(json.data) ? json.data as Trip[] : [];

  return (
    <main className="max-w-3xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-semibold">Trips</h1>

      {trips.length === 0 && (
        <p className="text-center text-gray-500">No trips found.</p>
      )}

      {trips
        .filter((trip) => trip != null && typeof trip === "object")
        .map((trip) => (
          <TripCard key={trip.id} trip={trip} />
        ))}
    </main>
  );
}
