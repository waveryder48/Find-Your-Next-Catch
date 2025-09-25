import { format } from "date-fns";

type Trip = {
    id: string;
    title: string;
    sourceUrl?: string | null;
    url?: string | null;
    depart_local?: string;
    return_local?: string | null;
    landing?: { id: string; name: string };
};

function cleanSpaces(s = "") {
    return s.replace(/\s+/g, " ").trim();
}
function humanizeCaps(s: string) {
    return s.replace(/([a-z])([A-Z])/g, "$1 $2");
}
function stripDupPhrases(s: string) {
    // collapse repeats like "...Passport RequiredPassport Required..."
    return s.replace(/(Passport Required)\1+/gi, "$1");
}

function parseFRNTitle(raw: string) {
    const base = cleanSpaces(stripDupPhrases(humanizeCaps(raw)));

    // split header from the date/time tail
    const dateIdx = base.search(/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/);
    const header = dateIdx > 0 ? base.slice(0, dateIdx).trim() : base;

    const TYPE_RX =
        /(AM|PM)\s+Half\s+Day|Full\s+Day(?:\s+Offshore)?|Twilight|Overnight|1\.5\s*Day(?:\s+Limited\s+Load)?|2\s*Day(?:\s+\w+)?|3\/4\s*Day|Half\s*Day|Ultra\s*Limited\s*Load|Limited\s*Load|Freelance|Charter(ed)?/i;

    const typeMatch = header.match(TYPE_RX);
    const tripType = cleanSpaces(typeMatch?.[0] ?? "Trip");
    const vessel = cleanSpaces(typeMatch ? header.slice(0, typeMatch.index).trim() : header) || "Trip";

    // price: first $###(.##)
    const priceMatch = base.match(/\$\s*([\d,]+(?:\.\d{2})?)/);
    const price = priceMatch ? Number(priceMatch[1].replace(/,/g, "")) : undefined;

    // FRN tail often: "... <load> $<price> <spots>"
    let load: number | undefined;
    let spots: number | undefined;
    const tailNums = base.match(/(\d+)\s*\$\s*[\d,]+(?:\.\d{2})?\s*(\d+)/);
    if (tailNums) {
        load = Number(tailNums[1]);
        spots = Number(tailNums[2]);
    }

    return { vessel, tripType, price, load, spots };
}

function availability(load?: number, spots?: number) {
    if (!load || spots == null) return { text: "—", cls: "bg-gray-400" };
    const booked = load - spots;
    const ratio = load > 0 ? booked / load : 1;
    const cls = ratio <= 0.65 ? "bg-green-500" : ratio <= 0.85 ? "bg-yellow-500" : "bg-red-500";
    return { text: `${spots} OPEN / ${load} MAX LOAD`, cls };
}

export default function TripCard({ trip }: { trip: Trip }) {
    if (!trip) return null;

    const parsed = parseFRNTitle(trip.title ?? "");
    const depart = trip.depart_local ? format(new Date(trip.depart_local), "M/d/yyyy, h:mm a") : "—";
    const ret = trip.return_local ? format(new Date(trip.return_local), "M/d/yyyy, h:mm a") : "—";
    const avail = availability(parsed.load, parsed.spots);
    const link = trip.sourceUrl || trip.url || null;

    return (
        <div className="border rounded-xl p-4 mb-4 shadow-sm">
            <div className="flex justify-between items-start">
                <div className="min-w-0">
                    <h2 className="text-lg font-semibold truncate">
                        {parsed.vessel} — {parsed.tripType}
                    </h2>
                    <p className="text-sm text-gray-600 truncate">
                        {trip.landing?.name ?? "—"}
                    </p>
                </div>
                <div className="text-right shrink-0 ml-4">
                    <p className="text-xs text-gray-500">PRICE (FROM)</p>
                    <p className="text-xl font-bold">{parsed.price != null ? `$${parsed.price}` : "—"}</p>
                </div>
            </div>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div>
                    <p className="font-medium">Departs</p>
                    <p>{depart}</p>
                </div>
                <div>
                    <p className="font-medium">Returns</p>
                    <p>{ret}</p>
                </div>
                <div className="flex items-center gap-2">
                    <p className="font-medium">Availability</p>
                    <span className={`text-white px-2 py-1 rounded ${avail.cls}`}>{avail.text}</span>
                </div>
            </div>

            {link && (
                <div className="mt-4 text-right">
                    <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block text-sm font-medium text-blue-600 hover:underline"
                    >
                        View Trip →
                    </a>
                </div>
            )}
        </div>
    );
}
