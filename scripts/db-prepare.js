const { Client } = require("pg");

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is missing");
  process.exit(1);
}

const client = new Client({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

(async () => {
  await client.connect();

  await client.query(`
    CREATE TABLE IF NOT EXISTS listings (
      id serial PRIMARY KEY,
      title text,
      sourceUrl text,
      city text,
      state text,
      providerWebsite text,
      description text,
      lat text,
      lng text,
      amenities text,
      species text,
      images text,
      v1_durationHours text,
      v1_isPrivate boolean,
      v1_priceFromDollars text,
      v1_priceUnit text,
      v2_durationHours text,
      v2_isPrivate boolean,
      v2_priceFromDollars text,
      v2_priceUnit text
    );
  `);

  // Remove duplicates by sourceUrl (keep newest id)
  await client.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='listings' AND column_name='sourceurl'
      ) THEN
        WITH ranked AS (
          SELECT id, sourceUrl,
                 ROW_NUMBER() OVER (PARTITION BY sourceUrl ORDER BY id DESC) AS rn
          FROM listings
        )
        DELETE FROM listings l
        USING ranked r
        WHERE l.id = r.id AND r.rn > 1;
      END IF;
    END
    $$;
  `);

  // Add a unique constraint on sourceUrl if missing
  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'listings_sourceurl_key'
      ) THEN
        ALTER TABLE listings
        ADD CONSTRAINT listings_sourceurl_key UNIQUE (sourceUrl);
      END IF;
    END
    $$;
  `);

  const res = await client.query("SELECT COUNT(*)::int AS count FROM listings;");
  console.log("Table ready. Current rows: " + res.rows[0].count);
  await client.end();
})().catch((e) => {
  console.error(e.stack || e);
  process.exit(1);
});
