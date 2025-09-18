import Link from "next/link";
import { db } from "@/lib/db";
import { landings, vesselLandings } from "@/drizzle/schema";
import { sql, eq } from "drizzle-orm";

export const revalidate = 3600;
export const metadata = { title: "Landings | FYNC", description: "Browse landings and their charter fleets." };

export default async function LandingsPage() {
    const rows = await db.select({
        name: landings.name,
        slug: landings.slug,
        website: landings.website,
        vesselCount: sql<number>`count(${vesselLandings.vesselId})`,
    })
        .from(landings)
        .leftJoin(vesselLandings, eq(landings.id, vesselLandings.landingId))
        .groupBy(landings.id)
        .orderBy(landings.name);

    return (
        <main className="mx-auto max-w-6xl p-6">
            <h1 className="text-3xl font-semibold mb-6">Landings</h1>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {rows.map((l) => (
                    <Link key={l.slug} href={`/landings/${l.slug}`} className="group rounded-2xl border p-5 hover:shadow-md">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-medium group-hover:underline">{l.name}</h2>
                            <span className="text-sm rounded-full border px-3 py-1">{l.vesselCount.toLocaleString()} vessels</span>
                        </div>
                        <p className="mt-2 truncate text-sm text-gray-500">{l.website}</p>
                    </Link>
                ))}
            </div>
        </main>
    );
}
