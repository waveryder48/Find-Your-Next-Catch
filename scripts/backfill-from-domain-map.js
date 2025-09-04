require('dotenv').config();
const fs = require('fs');
const { Client } = require('pg');

const map = JSON.parse(fs.readFileSync('./scripts/domain-map.json','utf8'));

function baseDomain(u) {
  try {
    const h = new URL(u).hostname.toLowerCase().replace(/^www\./,'');
    const parts = h.split('.');
    return parts.slice(-2).join('.');
  } catch { return null; }
}

(async () => {
  const c = new Client({
    connectionString: process.env.DATABASE_URL,
    // keep if your network does TLS inspection:
    ssl: { rejectUnauthorized: false }
  });
  await c.connect();

  // pull rows that need backfill
  const { rows } = await c.query(
    select id, sourceUrl, coalesce(nullif(city,''), null) as city,
           coalesce(nullif(state,''), null) as state,
           coalesce(nullif(providerWebsite,''), null) as providerWebsite
    from listings
  );

  let updates = 0;
  for (const r of rows) {
    const base = baseDomain(r.sourceurl || r.sourceUrl);
    if (!base) continue;
    const m = map[base];
    if (!m) continue;

    const newCity = r.city ?? m.city ?? null;
    const newState = r.state ?? m.state ?? null;
    const newProv = r.providerwebsite ?? r.providerWebsite ?? m.providerWebsite ?? null;

    // Only update if at least one field was missing and we have a value
    const needsCity = r.city == null && m.city;
    const needsState = r.state == null && m.state;
    const needsProv = (r.providerwebsite == null && m.providerWebsite) || (r.providerWebsite == null && m.providerWebsite);
    if (!(needsCity || needsState || needsProv)) continue;

    await c.query(
      update listings
         set city = coalesce(nullif(,''), city),
             state = coalesce(nullif(,''), state),
             providerWebsite = coalesce(nullif(,''), providerWebsite)
       where id = ,
      [m.city || '', m.state || '', m.providerWebsite || '', r.id]
    );
    updates++;
  }

  console.log(\Backfilled \ rows.\);
  await c.end();
})();
