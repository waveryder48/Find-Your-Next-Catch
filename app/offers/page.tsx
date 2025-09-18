import Link from "next/link";
import { db } from "@/db/index";
import { landings, vessels } from "@/db/schema";
import { tripOffers } from "@/db/schema.offers";
import { and, or, eq, ilike, asc, desc, sql, gte, lte, gt } from "drizzle-orm";
import SearchBar from "@/components/SearchBar";
import Pagination from "@/components/Pagination";
import SortSelect from "@/components/SortSelect";
import Filters from "@/components/Filters";
import OfferCard from "@/components/OfferCard";

function dollarsToCents(v?: string | null) { if (!v) return undefined; const n = Number(v); return Number.isFinite(n) ? Math.round(n*100) : undefined; }

export default async function OffersPage({ searchParams }: { searchParams: { q?: string; landingId?: string; vesselId?: string; sort?: string; p?: string; minPrice?: string; maxPrice?: string; startDate?: string; endDate?: string } }) {
  const q = (searchParams.q ?? "").trim();
  const landingId = searchParams.landingId ?? undefined;
  const vesselId = searchParams.vesselId ?? undefined;
  const sort = searchParams.sort ?? "date_desc";
  const page = Math.max(1, Number(searchParams.p ?? "1"));
  const pageSize = 24;

  const minPriceCents = dollarsToCents(searchParams.minPrice);
  const maxPriceCents = dollarsToCents(searchParams.maxPrice);
  const startDate = searchParams.startDate ? new Date(searchParams.startDate) : undefined;
  const endDate   = searchParams.endDate   ? new Date(searchParams.endDate)   : undefined;

  // upcoming only: (returns_at >= now) OR (returns_at is null AND departure_date >= now)
  const upcoming = sql`(
  (${tripOffers.returnsAt} is not null and ${tripOffers.returnsAt} >= now())
  or (${tripOffers.returnsAt} is null and ${tripOffers.departureDate} is not null and ${tripOffers.departureDate} >= now())
  or (${tripOffers.departureDate} is null and ${tripOffers.lastSeenAt} >= (now() - interval '7 days'))
)`;

  const conds: any[] = [upcoming];
  if (landingId) conds.push(eq(landings.id, landingId));
  if (vesselId)  conds.push(eq(vessels.id, vesselId));
  if (q) conds.push(or(ilike(tripOffers.title, `%${q}%`), ilike(vessels.name, `%${q}%`), ilike(landings.name, `%${q}%`)));
  if (minPriceCents != null) conds.push(gte(tripOffers.priceCents, minPriceCents));
  if (maxPriceCents != null) conds.push(lte(tripOffers.priceCents, maxPriceCents));
  if (startDate) conds.push(gte(tripOffers.departureDate, startDate));
  if (endDate)   conds.push(lte(tripOffers.departureDate, endDate));
  const where = and(...conds);

  const orderBy =
    sort === "price_asc" ? asc(tripOffers.priceCents) :
    sort === "price_desc"? desc(tripOffers.priceCents):
    sort === "date_asc"  ? asc(tripOffers.departureDate):
                           desc(tripOffers.departureDate);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(tripOffers)
    .innerJoin(vessels, eq(tripOffers.vesselId, vessels.id))
    .innerJoin(landings, eq(vessels.landingId, landings.id))
    .where(where as any);

  const rows = await db
    .select({
      id: tripOffers.id,
      title: tripOffers.title,
      priceCents: tripOffers.priceCents,
      departureDate: tripOffers.departureDate,
      returnsAt: tripOffers.returnsAt,
      lengthLabel: tripOffers.lengthLabel,
      loadLabel: tripOffers.loadLabel,
      summary: tripOffers.summary,
      spotsOpen: tripOffers.spotsOpen,
      capacity: tripOffers.capacity,
      includeMeals: tripOffers.includeMeals,
      includePermits: tripOffers.includePermits,
      sourceUrl: tripOffers.sourceUrl,
      vesselId: vessels.id, vesselName: vessels.name, vesselUrl: vessels.website, vesselImageUrl: vessels.imageUrl,
      landingId: landings.id, landingName: landings.name, landingUrl: landings.website,
    })
    .from(tripOffers)
    .innerJoin(vessels, eq(tripOffers.vesselId, vessels.id))
    .innerJoin(landings, eq(vessels.landingId, landings.id))
    .where(where as any)
    .orderBy(orderBy)
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const total = Number(count ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const landingOptions = await db
    .select({ id: landings.id, name: landings.name })
    .from(landings)
    .innerJoin(vessels, eq(vessels.landingId, landings.id))
    .innerJoin(tripOffers, eq(tripOffers.vesselId, vessels.id))
    .groupBy(landings.id, landings.name)
    .orderBy(asc(landings.name));

  const vesselOptions = landingId
    ? await db.select({ id: vessels.id, name: vessels.name }).from(vessels).where(eq(vessels.landingId, landingId)).orderBy(asc(vessels.name))
    : await db.select({ id: vessels.id, name: vessels.name }).from(vessels).orderBy(asc(vessels.name));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Offers</h1>
      </div>

      <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <SearchBar placeholder="Search offers, vessels, landings…" />
        <SortSelect options={[
          { value: "date_desc", label: "Newest first" },
          { value: "date_asc",  label: "Oldest first" },
          { value: "price_asc", label: "Price (low→high)" },
          { value: "price_desc",label: "Price (high→low)" },
        ]}/>
      </div>

      <Filters landings={landingOptions} vessels={vesselOptions} />

      <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {rows.map((o) => (<OfferCard key={o.id} o={o as any} />))}
      </ul>

      <Pagination totalPages={totalPages} />
    </div>
  );
}


