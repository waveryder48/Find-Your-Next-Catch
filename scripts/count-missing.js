require('dotenv').config();                  // <-- load .env
const { Client } = require('pg');

(async () => {
  const url = process.env.DATABASE_URL;
  if (!url) { console.error('DATABASE_URL missing'); process.exit(1); }

  const c = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false }       // keep if your network needs it
  });

  await c.connect();
  const r = await c.query(
    "select count(*) filter (where coalesce(nullif(city,''),null) is null) as missing, count(*) as total from listings"
  );
  console.log(r.rows[0]);
  await c.end();
})();
