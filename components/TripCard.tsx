import { format } from "date-fns";

export default function TripCard({ trip }: { trip: any }) {
    if (!trip) {
        console.warn("Trip is undefined:", trip);
        return null;
    }

    // Extract vessel name and trip type
    const vesselMatch = trip.title?.match(/^([\w\s]+?)(?=(AM|PM|Full|Half|1\.5|2|3\/4|Ultra|Twilight|Overnight|Freelance))/i);
    const vessel = vesselMatch?.[1]?.trim() ?? "Trip";

    const typeMatch = trip.title?.match(
        /(AM|PM)\s+Half\s+Day|Full\s+Day(?:\s+Offshore)?|Twilight|1\.5\s*Day\s+Limited\s+Load|2\s*Day(?:\s+\w+)?|Overnight|3\/4\s*Day|Half\s*Day|Ultra\s*Limited\s*Load|Freelance/gi
    );
    const tripType = typeMatch?.[0]?.trim() ?? "Trip";

    const depart = trip.depart_local ? format(new Date(trip.depart_local), "eee MMM d, h:mm a") : null;
    const returnTime = trip.return_local ? format(new Date(trip.return_local), "eee MMM d, h:mm a") : null;

    // Price
    const priceMatch = trip.title?.match(/\$(\d+)/);
    const price = priceMatch ? parseInt(priceMatch[1], 10) : trip.price ?? 0;

    // Parse spots/load from title as fallback
    const fallbackMatch = trip.title?.match(/(\d+)\s*\$(\d+)\s*(\d+)$/);
    const load = trip.load ?? (fallbackMatch ? parseInt(fallbackMatch[1]) : 0);
    const spots = trip.spots ?? (fallbackMatch ? parseInt(fallbackMatch[3]) : 0);

    const booked = load - spots;
    const availabilityRatio = load > 0 ? booked / load : 0;

    let availabilityColor = "bg-gray-400";
    if (availabilityRatio <= 0.65) {
        availabilityColor = "bg-green-500";
    } else if (availabilityRatio <= 0.85) {
        availabilityColor = "bg-yellow-500";
    } else {
        availabilityColor = "bg-red-500";
    }

    const availabilityDisplay =
        load > 0 ? `${spots} OPEN / ${load} MAX LOAD` : "—";

    return (
        <div className="border rounded-xl p-4 mb-4 shadow-sm">
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-lg font-semibold">
                        {vessel} — {tripType}
                    </h2>
                    <p className="text-sm text-gray-600">
                        {trip.landing?.name} · {trip.landing?.city}, {trip.landing?.state}
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-sm text-gray-500">PRICE (FROM)</p>
                    <p className="text-xl font-bold">${price}</p>
                </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                <div>
                    <p className="font-medium">Departs</p>
                    <p>{depart ?? "—"}</p>
                </div>
                <div>
                    <p className="font-medium">Returns</p>
                    <p>{returnTime ?? "—"}</p>
                </div>
                <div>
                    <p className="font-medium">Availability</p>
                    <span className={`text-white px-2 py-1 rounded ${availabilityColor}`}>
                        {availabilityDisplay}
                    </span>
                </div>
            </div>
        </div>
    );
}
