import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { landings, vessels, vesselLandings } from "@/drizzle/schema";
import { eq, ilike, and, inArray } from "drizzle-orm";
import VesselSearch from "@/components/vessel-search";
import Pagination from "@/components/pagination";

export const revalidate = 300;

export default async function LandingDetailPage({ params, searchParams }: { params: { slug: string }, searchParams: { q?: string; page?: string } }) {
    const q = (searchParams.q || "").trim();
    const currentPage = Math.max(1, parseInt(searchParams.page || "1", 10) || 1);
    const per = 24;

    const landing = await db.query.landings.findFirst({ where: (t, { eq }) => eq(t.slug, params.slug) });
    if (!landing) notFound();

    const whereV = and(
        ilike(vessels.name, q ? `%${q}%` : `%`),
        eq(vesselLandings.landingId, landing.id)
    );

    const [{ count }] = await db.execute<{ count: string }>(`select count(distinct v.id)::int as count
    from vessels v join vessel_landings vl on vl.vessel_id = v.id
    where vl.landing_id = $1 and v.name ilike $2`, [landing.id, q ? `%${q}%` : `%`]);
    const total = Number(count ?? 0);
    const totalPages = Math.max(1, Math.ceil(total / per));

    const rows = await db.execute<{
        id: string; name: string; slug: string; vessel_page_url: string; landing_slug: string; landing_name: string;
    }>(
        `select v.id, v.name, v.slug, vl.vessel_page_url, l.slug as landing_slug, l.name as landing_name
     from vessels v
     join vessel_landings vl on vl.vessel_id = v.id
     join landings l on l.id = vl.landing_id
     where vl.landing_id = $1 and v.name ilike $2
     order by v.name asc
     limit $3 offset $4`,
        [landing.id, q ? `%${q}%` : `%`, per, (currentPage - 1) * per]
    );
    const byV = new Map<string, { name: string; slug: string; landings: any[] }>();
    for (const r of rows.rows) {
        if (!byV.has(r.id)) byV.set(r.id, { name: r.name, slug: r.slug, landings: [] });
        byV.get(r.id)!.landings.push({ landing: { name: r.landing_name, slug: r.landing_slug }, vesselPageUrl: r.vessel_page_url });
    }
    const vesselsList = Array.from(byV.values());

    return (
        <main className="mx-auto max-w-6xl p-6">
            <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-3xl font-semibold">{landing.name}</h1>
                    <p className="text-sm text-gray-500">
                        {total.toLocaleString()} vessels •{" "}
                        <a href={landing.website} target="_blank" className="underline">{landing.website}</a>
                    </p>
                </div>
                <VesselSearch defaultValue={q} />
            </div>

            {vesselsList.length === 0 ? (
                <p className="text-gray-600">No vessels found{q ? ` for “${q}”` : ""}.</p>
            ) : (
                <>
                    <ul className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                        {vesselsList.map((v) => {
                            const firstLink = v.landings[0]?.vesselPageUrl;
                            return (
                                <li key={v.slug} className="rounded-2xl border p-5">
                                    <div className="flex items-start justify-between">
                                        <h2 className="text-lg font-medium">{v.name}</h2>
                                    </div>
                                    {firstLink ? (
                                        <a href={firstLink} target="_blank" className="mt-2 inline-block text-sm underline">View vessel page</a>
                                    ) : (
                                        <p className="mt-2 text-sm text-gray-500">No page link available.</p>
                                    )}
                                    <div className="mt-3 text-xs text-gray-500">
                                        Also listed under:{" "}
                                        {v.landings.map((lnk: any, i: number) => (
                                            <span key={`${v.slug}-${lnk.landing.slug}-${i}`}>
                                                <Link className="underline" href={`/landings/${lnk.landing.slug}`}>{lnk.landing.name}</Link>
                                                {i < v.landings.length - 1 ? ", " : ""}
                                            </span>
                                        ))}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>

                    <div className="mt-6">
                        <Pagination basePath={`/landings/${landing.slug}`} currentPage={currentPage} totalPages={totalPages} searchParams={{ q }} />
                    </div>
                </>
            )}
        </main>
    );
}
