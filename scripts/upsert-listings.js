require('dotenv').config({ path: '.env' }); // or '.env.production.local'
// scripts/upsert-listings.js
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
const csv = require("csv-parser");

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is missing (set it in your env)");
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  // Needed for your network in dev:
  ssl: { rejectUnauthorized: false },
});

const file = path.resolve("listings.csv");

// convert common truthy/falsey strings to boolean or null
function toBool(v) {
  if (v == null) return null;
  const s = String(v).trim().toLowerCase();
  if (s === "") return null;
  if (["true", "t", "yes", "y", "1", "private"].includes(s)) return true;
  if (["false", "f", "no", "n", "0", "public"].includes(s)) return false;
  return null;
}

(async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS listings (
      id                serial PRIMARY KEY,
      title             text,
      sourceurl         text,
      city              text,
      state             text,
      providerwebsite   text,
      description       text,
      lat               text,
      lng               text,
      amenities         text,
      species           text,
      images            text,
      v1_durationhours  text,
      v1_isprivate      boolean,
      v1_pricefromdollars text,
      v1_priceunit      text,
      v2_durationhours  text,
      v2_isprivate      boolean,
      v2_pricefromdollars text,
      v2_priceunit      text
    );
  `);

  // Ensure a unique key so we can upsert on sourceUrl
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'listings_sourceurl_key'
      ) THEN
        ALTER TABLE listings
        ADD CONSTRAINT listings_sourceurl_key UNIQUE (sourceurl);
      END IF;
    END$$;
  `);

  const rows = [];
  await new Promise((resolve, reject) => {
    fs.createReadStream(file)
      .pipe(csv())
      .on("data", (r) => {
        rows.push({
          title: r.title ?? null,
          sourceurl: r.sourceUrl ?? r.sourceurl ?? null,
          city: r.city ?? null,
          state: r.state ?? null,
          providerwebsite: r.providerWebsite ?? r.providerwebsite ?? null,
          description: r.description ?? null,
          lat: r.lat ?? null,
          lng: r.lng ?? null,
          amenities: r.amenities ?? null,
          species: r.species ?? null,
          images: r.images ?? null,
          v1_durationhours: r.v1_durationHours ?? r.v1_durationhours ?? null,
          v1_isprivate: toBool(r.v1_isPrivate ?? r.v1_isprivate),
          v1_pricefromdollars: r.v1_priceFromDollars ?? r.v1_pricefromdollars ?? null,
          v1_priceunit: r.v1_priceUnit ?? r.v1_priceunit ?? null,
          v2_durationhours: r.v2_durationHours ?? r.v2_durationhours ?? null,
          v2_isprivate: toBool(r.v2_isPrivate ?? r.v2_isprivate),
          v2_pricefromdollars: r.v2_priceFromDollars ?? r.v2_pricefromdollars ?? null,
          v2_priceunit: r.v2_priceUnit ?? r.v2_priceunit ?? null,
        });
      })
      .on("end", resolve)
      .on("error", reject);
  });

  if (!rows.length) {
    console.log("No rows found in listings.csv");
    process.exit(0);
  }

  // Upsert in small chunks to keep parameter counts reasonable
  const cols = [
    "title", "sourceurl", "city", "state", "providerwebsite", "description", "lat", "lng",
    "amenities", "species", "images", "v1_durationhours", "v1_isprivate", "v1_pricefromdollars",
    "v1_priceunit", "v2_durationhours", "v2_isprivate", "v2_pricefromdollars", "v2_priceunit"
  ];

  const chunkSize = 50;
  let total = 0;

  for (let start = 0; start < rows.length; start += chunkSize) {
    const chunk = rows.slice(start, start + chunkSize);

    const values = [];
    const placeholders = chunk
      .map((row, i) => {
        const base = i * cols.length;
        cols.forEach((c) => values.push(row[c]));
        return `(${Array.from({ length: cols.length }, (_, j) => `$${base + j + 1}`).join(",")})`;
      })
      .join(",");

    const sql = `
      INSERT INTO listings (${cols.join(",")})
      VALUES ${placeholders}
      ON CONFLICT (sourceurl) DO UPDATE SET
        title               = COALESCE(NULLIF(EXCLUDED.title,''), listings.title),
        city                = COALESCE(NULLIF(EXCLUDED.city,''), listings.city),
        state               = COALESCE(NULLIF(EXCLUDED.state,''), listings.state),
        providerwebsite     = COALESCE(NULLIF(EXCLUDED.providerwebsite,''), listings.providerwebsite),
        description         = COALESCE(NULLIF(EXCLUDED.description,''), listings.description),
        lat                 = COALESCE(NULLIF(EXCLUDED.lat,''), listings.lat),
        lng                 = COALESCE(NULLIF(EXCLUDED.lng,''), listings.lng),
        amenities           = COALESCE(NULLIF(EXCLUDED.amenities,''), listings.amenities),
        species             = COALESCE(NULLIF(EXCLUDED.species,''), listings.species),
        images              = COALESCE(NULLIF(EXCLUDED.images,''), listings.images),
        v1_durationhours    = COALESCE(NULLIF(EXCLUDED.v1_durationhours,''), listings.v1_durationhours),
        v1_isprivate        = COALESCE(EXCLUDED.v1_isprivate, listings.v1_isprivate),
        v1_pricefromdollars = COALESCE(NULLIF(EXCLUDED.v1_pricefromdollars,''), listings.v1_pricefromdollars),
        v1_priceunit        = COALESCE(NULLIF(EXCLUDED.v1_priceunit,''), listings.v1_priceunit),
        v2_durationhours    = COALESCE(NULLIF(EXCLUDED.v2_durationhours,''), listings.v2_durationhours),
        v2_isprivate        = COALESCE(EXCLUDED.v2_isprivate, listings.v2_isprivate),
        v2_pricefromdollars = COALESCE(NULLIF(EXCLUDED.v2_pricefromdollars,''), listings.v2_pricefromdollars),
        v2_priceunit        = COALESCE(NULLIF(EXCLUDED.v2_priceunit,''), listings.v2_priceunit)
    `;

    await pool.query(sql, values);
    total += chunk.length;
  }

  const { rows: [{ count }] } = await pool.query("SELECT COUNT(*)::int AS count FROM listings;");
  console.log(`Upserted ${total} rows. Table now has ${count} rows.`);

  await pool.end();
})().catch(async (e) => {
  console.error("Upsert failed:", e.stack || e);
  process.exit(1);
});
