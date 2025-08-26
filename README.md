# ReelFind — Full v1 (Finder Model: Leads + Clickouts)

This version includes Prisma models for Providers/Listings/TripVariants/Leads/Clickouts and API endpoints:
- `POST /api/leads` — create a lead (stores in DB if `DATABASE_URL` set, else logs)
- `GET /api/clickout?listingId=...&target=...` — logs a click and redirects to captain site
- `GET /api/listings` — serves listings from DB if available, otherwise mock JSON
- `POST /api/ingest` — upsert a provider + listing + variants from normalized payload

## Run locally
```bash
npm install
npm run dev
# open http://localhost:3000
```
Works immediately with mock data.

## Optional: connect a real database (Supabase/Postgres)
1) Create a Supabase project → copy the **Connection string** (Postgres).
2) Create `.env.local` in the project root and set:
```
DATABASE_URL=postgres://USER:PASSWORD@HOST:PORT/postgres
```
3) Push schema & generate client:
```bash
npm run prisma:generate
npm run prisma:push
npm run seed   # optional seed
```
4) Restart dev server.

## Deploy to Vercel
- Add `DATABASE_URL` in **Vercel → Project → Settings → Environment Variables** (leave blank to run on mock data).
- Deploy. The site runs either way; DB is optional at first.

## Ingest (manual for now)
Send a JSON POST to `/api/ingest` (use Thunder Client, Postman, or curl):
```json
{
  "provider": { "name": "Pelagic Hunter", "website": "https://pelagic.example.com" },
  "listing": {
    "title": "San Diego Full-Day Bluewater — Pelagic Hunter",
    "city": "San Diego",
    "state": "CA",
    "capacity": 6,
    "images": ["/boats/pelagic.jpg"],
    "sourceUrl": "https://pelagic.example.com/trips/full-day"
  },
  "variants": [
    { "durationHours": 8, "isPrivate": true, "priceFrom": 1450, "priceUnit": "trip" }
  ]
}
```
This will upsert the provider + listing; if no DB, it will log the payload.

## Roadmap
- Crawler worker (Playwright) to fetch provider pages and POST normalized data to `/api/ingest`.
- Stripe Billing for finder’s fee (metered leads).
- Typesense for faceted search (optional).
