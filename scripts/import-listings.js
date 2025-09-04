// scripts/import-listings.js (example)
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient(); // use a local PrismaClient in scripts

// TOP OF FILE
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const csv = require('csv-parser');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL is missing');
  process.exit(1);
}

// Force SSL and skip CA verification (works behind corp proxies)
const client = new Client({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const file = path.resolve('listings.csv');

const toBool = (v) => {
  if (v == null) return null;
  const s = String(v).trim().toLowerCase();
  if (s === '') return null;
  if (['true', 't', 'yes', 'y', '1', 'private'].includes(s)) return true;
  if (['false', 'f', 'no', 'n', '0', 'public'].includes(s)) return false;
  return null;
};

(async () => {
  await client.connect();

  // Create table if it doesn't exist (adjust if your schema differs)
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

  const rows = [];
  fs.createReadStream(file)
    .pipe(csv())
    .on('data', (r) => {
      rows.push([
        r.title ?? null,
        r.sourceUrl ?? null,
        r.city ?? null,
        r.state ?? null,
        r.providerWebsite ?? null,
        r.description ?? null,
        r.lat ?? null,
        r.lng ?? null,
        r.amenities ?? null,
        r.species ?? null,
        r.images ?? null,
        r.v1_durationHours ?? null,
        toBool(r.v1_isPrivate),
        r.v1_priceFromDollars ?? null,
        r.v1_priceUnit ?? null,
        r.v2_durationHours ?? null,
        toBool(r.v2_isPrivate),
        r.v2_priceFromDollars ?? null,
        r.v2_priceUnit ?? null,
      ]);
    })
    .on('end', async () => {
      if (!rows.length) {
        console.log('No rows found in listings.csv');
        await client.end();
        return;
      }

      // Insert in one statement (115 rows is fine). If you prefer, chunk this.
      const cols = [
        'title', 'sourceUrl', 'city', 'state', 'providerWebsite', 'description', 'lat', 'lng',
        'amenities', 'species', 'images', 'v1_durationHours', 'v1_isPrivate', 'v1_priceFromDollars',
        'v1_priceUnit', 'v2_durationHours', 'v2_isPrivate', 'v2_priceFromDollars', 'v2_priceUnit'
      ];
      const placeholders = rows.map(
        (_, i) => `(${Array.from({ length: cols.length }, (_, j) => '$' + (i * cols.length + j + 1)).join(',')})`
      ).join(',');

      const sql = `
        INSERT INTO listings (${cols.join(',')})
        VALUES ${placeholders};
      `;

      await client.query('BEGIN');
      try {
        await client.query(sql, rows.flat());
        await client.query('COMMIT');
        const { rows: [{ count }] } = await client.query('SELECT COUNT(*)::int AS count FROM listings;');
        console.log(`Imported ${rows.length} rows. Table now has ${count} rows.`);
      } catch (e) {
        await client.query('ROLLBACK');
        console.error('Import failed:', e.message);
      } finally {
        await client.end();
      }
    });
})();

