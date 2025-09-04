// scripts/enrich-csv.js
// Fill city/state/providerWebsite based on the sourceUrl's base domain.

const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const IN  = path.resolve('listings.csv');
const OUT = path.resolve('listings_enriched.csv');

const domainMap = {
  'fishermanslanding.com':   { city: 'San Diego',       state: 'CA', providerWebsite: 'https://www.fishermanslanding.com/' },
  'hmlanding.com':           { city: 'San Diego',       state: 'CA', providerWebsite: 'https://www.hmlanding.com/' },
  'pointlomasportfishing.com':{ city: 'San Diego',      state: 'CA', providerWebsite: 'https://www.pointlomasportfishing.com/' },
  'seaforthlanding.com':     { city: 'San Diego',       state: 'CA', providerWebsite: 'https://www.seaforthlanding.com/' },
  'danawharf.com':           { city: 'Dana Point',      state: 'CA', providerWebsite: 'https://danawharf.com/' },
  'daveyslocker.com':        { city: 'Newport Beach',   state: 'CA', providerWebsite: 'https://daveyslocker.com/' },
  'pierpoint.net':           { city: 'Long Beach',      state: 'CA', providerWebsite: 'https://pierpoint.net/' },
  'longbeachsportfishing.org':{ city: 'Long Beach',     state: 'CA', providerWebsite: 'https://www.longbeachsportfishing.org/' },
  '22ndstreet.com':          { city: 'San Pedro',       state: 'CA', providerWebsite: 'https://www.22ndstreet.com/' },
  'redondosportfishing.com': { city: 'Redondo Beach',   state: 'CA', providerWebsite: 'https://www.redondosportfishing.com/' },
  'mdrsf.com':               { city: 'Marina del Rey',  state: 'CA', providerWebsite: 'https://mdrsf.com/' },
  'channelislandssportfishing.com': { city: 'Oxnard',   state: 'CA', providerWebsite: 'https://www.channelislandssportfishing.com/' },
  'hookslanding.net':        { city: 'Oxnard',          state: 'CA', providerWebsite: 'https://www.hookslanding.net/' },
  'venturasportfishing.com': { city: 'Ventura',         state: 'CA', providerWebsite: 'https://venturasportfishing.com/' },
  'stardustsportfishing.com':{ city: 'Santa Barbara',   state: 'CA', providerWebsite: 'https://www.stardustsportfishing.com/' },
  'morrobaylanding.com':     { city: 'Morro Bay',       state: 'CA', providerWebsite: 'https://morrobaylanding.com/' },
};

const baseDomain = (u) => {
  try {
    const host = new URL(u).hostname.replace(/^www\./i, '');
    const parts = host.split('.');
    return parts.slice(-2).join('.');
  } catch {
    return null;
  }
};

(async () => {
  const rows = [];
  await new Promise((resolve, reject) => {
    fs.createReadStream(IN)
      .pipe(csv())
      .on('data', (r) => {
        const bd = baseDomain(r.sourceUrl || '');
        const mapped = bd ? domainMap[bd] : null;

        // Only fill if blank
        if (mapped) {
          r.city = (r.city || '').trim() || mapped.city;
          r.state = (r.state || '').trim() || mapped.state;
          r.providerWebsite = (r.providerWebsite || '').trim() || mapped.providerWebsite;
        }
        rows.push(r);
      })
      .on('end', resolve)
      .on('error', reject);
  });

  if (!rows.length) {
    console.log('No rows found in listings.csv');
    return;
  }

  // Write CSV header in the same order as your file
  const headers = Object.keys(rows[0]);
  const toCsv = [
    headers.join(','),
    ...rows.map(r => headers.map(h => {
      const v = r[h] ?? '';
      // escape quotes & commas
      const s = String(v).replace(/"/g, '""');
      return /[",\n]/.test(s) ? `"${s}"` : s;
    }).join(','))
  ].join('\n');

  fs.writeFileSync(OUT, toCsv, 'utf8');
  console.log(`Wrote ${OUT} with ${rows.length} rows.`);
})();
