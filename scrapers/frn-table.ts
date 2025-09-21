// scrapers/frn-table.ts
import { Page } from "playwright";
import { sql } from "drizzle-orm";
import { db } from "../lib/db";

export type LandingRef = { id: string; slug: string; name: string };

function uuid() {
    try {
        // @ts-ignore
        const { randomUUID } = require("node:crypto");
        return randomUUID();
    } catch {
        return Math.random().toString(36).slice(2) + Date.now().toString(36);
    }
}

// ---------- Node-side parsing utilities ----------
function parsePriceCents(s?: string | null): number | null {
    if (!s) return null;
    const m = s.replace(/[, ]/g, "").match(/\$?\s*([\d]+(?:\.\d{2})?)/);
    if (!m) return null;
    const dollars = Number(m[1]);
    return Number.isFinite(dollars) ? Math.round(dollars * 100) : null;
}

function parseDateTimes(text: string): { depart?: Date; ret?: Date } {
    // Examples in FRN rows:
    // "Sat. 9-20-2025 6:00 PM ... 10:30 PM"
    // "Sun. 9-21-2025 12:30 PM Sun. 9-21-2025 5:30 PM"
    const rxDateTime = /(?:(Sun|Mon|Tue|Wed|Thu|Fri|Sat)\.?\s*)?(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\s+(\d{1,2}):(\d{2})\s*(AM|PM)/gi;
    const hits: Date[] = [];
    let m: RegExpExecArray | null;
    while ((m = rxDateTime.exec(text))) {
        const mm = Number(m[2]), dd = Number(m[3]);
        let yyyy = Number(m[4]); if (yyyy < 100) yyyy += 2000;
        let hh = Number(m[5]); const min = Number(m[6]); const ap = m[7].toUpperCase();
        if (ap === "PM" && hh < 12) hh += 12;
        if (ap === "AM" && hh === 12) hh = 0;
        hits.push(new Date(yyyy, mm - 1, dd, hh, min, 0, 0));
    }
    if (hits.length === 0) {
        // fallback: just time-of-day; take next occurrence of that DOW
        const tm = text.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        const dow = text.match(/\b(Sun|Mon|Tue|Wed|Thu|Fri|Sat)\b/i);
        if (tm && dow) {
            const now = new Date();
            const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
            const want = days.findIndex(d => new RegExp(d, "i").test(dow[1]));
            const add = (want - now.getDay() + 7) % 7;
            let yyyy = now.getFullYear(), mm = now.getMonth(), dd = now.getDate() + add;
            let hh = Number(tm[1]), min = Number(tm[2]); const ap = tm[3].toUpperCase();
            if (ap === "PM" && hh < 12) hh += 12;
            if (ap === "AM" && hh === 12) hh = 0;
            return { depart: new Date(yyyy, mm, dd, hh, min, 0, 0) };
        }
    }
    return { depart: hits[0], ret: hits[1] };
}

function parseOpen(s?: string | null): number | null {
    if (!s) return null;
    const m = s.match(/(\d+)\s*(open|spots?|avail)/i) || s.match(/(open|spots?|avail)[^\d]*(\d+)/i);
    const val = (m && (m[1] || m[2])) ?? null;
    const n = val ? Number(val) : NaN;
    return Number.isFinite(n) ? n : null;
}

function toIso(d?: Date | null): string | null {
    return d ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().replace("Z", "") : null;
}

// ---------- Scraper ----------
export const frnTableScraper = {
    id: "FR" as const,

    detect(row: { bookingUrl?: string; notes?: string; source?: string }) {
        const blob = `${row.bookingUrl ?? ""} ${row.notes ?? ""} ${row.source ?? ""}`;
        return /fishingreservations\.net|^frn?$/i.test(blob);
    },

    async run(page: Page, landing: LandingRef, scheduleUrl: string): Promise<{ tripsUpserted: number }> {
        await page.goto(scheduleUrl, { waitUntil: "domcontentloaded" });

        const frames = page.frames();
        const target =
            frames.find((f) => /fishingreservations\.net/i.test(f.url())) || page.mainFrame();

        // run in browser context without capturing functions (avoids __name issue)
        const json = await target.evaluate(`
(() => {
  const norm = s => (s ?? '').replace(/\\s+/g, ' ').trim();
  const out = [];

  const rows = Array.from(document.querySelectorAll('tr'));
  for (const tr of rows) {
    const text = norm(tr.textContent);
    if (!text) continue;
    if (!tr.querySelector('a,button')) continue;
    if (/whale\\s*watch/i.test(text)) continue;

    const cells = Array.from(tr.querySelectorAll('td,th')).map(c => norm(c.textContent));
    const priceIdx = cells.findIndex(c => /\\$\\s*\\d/.test(c));
    const priceText = priceIdx >= 0 ? cells[priceIdx] : (text.match(/\\$\\s*\\d[\\d,]*(?:\\.\\d{2})?/) || [''])[0];

    // capacity (max load) is usually the numeric cell immediately LEFT of price
    let capacity = null;
    if (priceIdx > 0) {
      const cand = cells[priceIdx - 1];
      const m = cand.match(/^(\\d{1,3})$/);
      if (m) capacity = Number(m[1]);
    }

    // open spots: look at the cell to the RIGHT of price, or text with 'open/avail'
    let open = null;
    if (priceIdx >= 0 && priceIdx + 1 < cells.length) {
      const next = cells[priceIdx + 1];
      const m = next.match(/^(\\d{1,3})$/);
      if (m) open = Number(m[1]);
    }
    if (open == null) {
      const m = text.match(/(\\d+)\\s*(open|spots?|avail)/i) || text.match(/(open|spots?|avail)[^\\d]*(\\d+)/i);
      const val = (m && (m[1] || m[2])) ?? null;
      if (val) open = Number(val);
    }

    // title + times + href
    const hrefEl = tr.querySelector('a[href]');
    const href = hrefEl ? hrefEl.href : '';
    // prefer a text-y cell for the title
    const titleCell =
      cells.find(c => /[A-Za-z]/.test(c) && !/\\$\\s*\\d/.test(c)) ||
      text.slice(0, 140);

    // collect two date-time patterns if present (depart / return)
    const dateBits = text.match(/\\b\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4}\\s+\\d{1,2}:\\d{2}\\s*(?:AM|PM)\\b/gi) || [];
    const timeText = dateBits.join(' | '); // Node side will parse both

    out.push({ title: titleCell, rowText: text, timeText, priceText, capacity, open, href });
  }

  if (out.length === 0) {
    // fallback: "Book" buttons on card layouts
    const buttons = Array.from(document.querySelectorAll('a,button')).filter(el => /book/i.test(norm(el.textContent)));
    for (const btn of buttons) {
      const box = btn.closest('div,li,article,section') || document.body;
      const text = norm(box.textContent);
      if (/whale\\s*watch/i.test(text)) continue;
      const priceText = (text.match(/\\$\\s*\\d[\\d,]*(?:\\.\\d{2})?/) || [''])[0];
      const dateBits = text.match(/\\b\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4}\\s+\\d{1,2}:\\d{2}\\s*(?:AM|PM)\\b/gi) || [];
      const header = box.querySelector('h1,h2,h3,header,strong,b');
      const title = norm(header ? header.textContent : '') || text.slice(0, 140);
      const href = (btn && btn.href) ? btn.href : '';
      out.push({ title, rowText: text, timeText: dateBits.join(' | '), priceText, capacity: null, open: null, href });
    }
  }

  return JSON.stringify({ count: out.length, rows: out });
})()
    `.trim());

        const data: {
            count: number; rows: Array<{
                title: string; rowText: string; timeText: string; priceText: string;
                capacity: number | null; open: number | null; href: string;
            }>
        } = JSON.parse(json);

        if (process.env.DEBUG_FRN) {
            console.log("[frn-dom] rows=" + data.count);
            data.rows.slice(0, 8).forEach(r =>
                console.log("  •", r.title, "|", r.timeText, "|", r.priceText, "|", r.capacity, r.open)
            );
        }

        let upserted = 0;
        for (const r of data.rows) {
            const { depart, ret } = parseDateTimes(r.timeText || r.rowText);
            const departIso = toIso(depart);
            if (!departIso) continue;

            const priceCents = parsePriceCents(r.priceText);
            const open = r.open ?? parseOpen(r.rowText);
            const capacity = r.capacity ?? null;

            const sourceTripId =
                r.href && /fishingreservations\.net/.test(r.href)
                    ? r.href
                    : `${landing.slug}|${r.title}|${departIso}`.slice(0, 512);

            const tripId = uuid();
            await db.execute(sql`
        INSERT INTO trips (
          id, source, source_trip_id, source_url,
          landing_id, vessel_id,
          title, notes,
          passport_req, meals_incl, permits_incl,
          depart_local, return_local, timezone,
          load, spots, status,
          price_includes_fees, service_fee_pct,
          last_scraped_at, created_at, updated_at
        ) VALUES (
          ${tripId}, 'FR', ${sourceTripId}, ${r.href || scheduleUrl},
          ${landing.id}, NULL,
          ${r.title}, ${r.rowText},
          false, false, false,
          ${departIso}, ${toIso(ret)}, 'America/Los_Angeles',
          ${capacity}, ${open}, 'AVAILABLE',
          false, NULL,
          NOW(), NOW(), NOW()
        )
        ON CONFLICT (source, source_trip_id) DO UPDATE SET
          source_url     = EXCLUDED.source_url,
          title          = EXCLUDED.title,
          notes          = EXCLUDED.notes,
          depart_local   = EXCLUDED.depart_local,
          return_local   = COALESCE(EXCLUDED.return_local, trips.return_local),
          load           = COALESCE(EXCLUDED.load, trips.load),
          spots          = COALESCE(EXCLUDED.spots, trips.spots),
          updated_at     = NOW()
      `);

            if (priceCents != null) {
                await db.execute(sql`
          INSERT INTO fare_tiers (id, trip_id, type, label, price_cents, currency)
          SELECT ${uuid()}, t.id, 'ADULT', 'Adult', ${priceCents}, 'USD'
          FROM trips t
          WHERE t.source = 'FR' AND t.source_trip_id = ${sourceTripId}
          ON CONFLICT DO NOTHING
        `);
            }

            upserted++;
        }

        return { tripsUpserted: upserted };
    },
};
