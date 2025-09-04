require('dotenv').config();
const { Client } = require('pg');

(async () => {
  const c = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();

  const sql = 
    select
      sum((nullif(title,'') is null)::int)           as title_missing,
      sum((nullif(state,'') is null)::int)           as state_missing,
      sum((nullif(providerwebsite,'') is null)::int) as provider_missing
    from listings
  ;
  const r = await c.query(sql);
  console.log(r.rows[0]);
  await c.end();
})();
