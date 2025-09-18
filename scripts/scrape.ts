import "dotenv/config";
import { db } from "../db";
import { vessels } from "../db/schema";
import { tripOffers } from "../db/schema.offers";
import { scrapeTargets } from "../db/schema.scrape";
import { chromium } from "playwright";
import * as cheerio from "cheerio";
import Bottleneck from "bottleneck";
import crypto from "node:crypto";
import { sql, and, eq } from "drizzle-orm";

type Offer = {
  title: string;
  priceCents?: number;
  currency?: string;
  sourceUrl: string;
  departureDate?: Date | null;
  returnsAt?: Date | null;
  lengthLabel?: string | null;
  loadLabel?: string | null;
  summary?: string | null;
  spotsOpen?: number | null;
  capacity?: number | null;
  includeMeals?: boolean | null;
  includePermits?: boolean | null;
  vesselName?: string | null;
  landingId?: string;
};

const UA = process.env.SCRAPER_UA || "FYNCBot/1.0 (+contact: you@example.com)";
const limiter = new Bottleneck({ minTime: 800, maxConcurrent: 1 });

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const dedup = (items: Offer[]) => {
  const m = new Map<string, Offer>();
  for (const o of items) m.set(`${norm(o.vesselName||"")}|${norm(o.title)}|${o.priceCents}|${o.departureDate?.toISOString()||""}`, o);
  return [...m.values()];
};

function dollarAmounts(text: string): number[] {
  const out:number[] = []; const re=/\$\s*([0-9]{1,3}(?:,[0-9]{3})*)(?:\.(\d{2}))?/g; let m:RegExpExecArray|null;
  while ((m=re.exec(text))){const d=parseInt(m[1].replace(/,/g,""),10);const c=m[2]?parseInt(m[2],10):0;out.push(d*100+c);}
  return out;
}
// pick a fare between $50 and $5000; prefer the **median** in-range to avoid $1 deposits / $28 fees
function pickFareCents(text: string): number | undefined {
  const nums = dollarAmounts(text).filter(n => n >= 5000 && n <= 500000);
  if (!nums.length) return undefined;
  const sorted = nums.sort((a,b)=>a-b);
  return sorted[Math.floor(sorted.length/2)];
}

const clean = (s:string) => s.replace(/\s+/g," ").replace(/\$[0-9,]+(\.\d{2})?/g,"").trim();
function parseLengthLabel(text:string):string|null{
  const m=text.match(/\b(1\/2\s*Day|3\/4\s*Day|Full\s*Day|Overnight|(\d+(?:\.\d+)?)\s*Day|\d{1,2}\s*-\s*hour)\b/i);
  return m?m[0].replace(/\s+/g," "):null;
}
function parseDateSmart(text:string, today=new Date()):Date|null{
  const md=text.match(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/);
  if(md){const mm=+md[1],dd=+md[2];let yy=md[3]? (md[3].length===2?2000+ +md[3]:+md[3]) : today.getFullYear();
    let d=new Date(yy,mm-1,dd); const t0=new Date(today.getFullYear(),today.getMonth(),today.getDate()); if(d<t0) d=new Date(yy+1,mm-1,dd); return d;}
  const mname=text.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+(\d{1,2})(?:,\s*(\d{4}))?\b/i);
  if(mname){const map:any={jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11};
    const mm=map[mname[1].slice(0,3).toLowerCase()], dd=+mname[2]; let yy=mname[3]?+mname[3]:today.getFullYear();
    let d=new Date(yy,mm,dd); const t0=new Date(today.getFullYear(),today.getMonth(),today.getDate()); if(d<t0) d=new Date(yy+1,mm,dd); return d;}
  return null;
}
function computeReturnsFromLength(dep:Date|null, len?:string|null):Date|null{
  if(!dep||!len) return null; const l=len.toLowerCase(); let days=0;
  if(l.includes("overnight")) days=1; else {const n=l.match(/(\d+(?:\.\d+)?)\s*day/); if(n) days=parseFloat(n[1]); else if(/\bfull\b/.test(l)) days=1;}
  return days? new Date(dep.getTime()+days*24*60*60*1000): null;
}
// occupancy: avoid misreading "1/2 Day", "3/4 Day", "8-hour" as capacity
function parseOccupancy(text:string){
  const lower = text.toLowerCase();
  const badAround = /(1\/2|3\/4|\d{1,2}\s*-\s*hour|\d+(?:\.\d+)?\s*day)/i;

  const of = text.match(/\b(\d{1,3})\s*(?:of|\/)\s*(\d{1,3})\b/i);
  if (of) {
    const start = Math.max(0, (of.index ?? 0) - 8);
    const look  = lower.slice(start, (of.index ?? 0) + of[0].length + 8);
    if (!badAround.test(look)) {
      const cur = parseInt(of[1],10), cap = parseInt(of[2],10);
      if (cap > 0 && cur <= cap && cap <= 200) return { open: cap - cur, cap };
    }
  }
  const a = text.match(/\b(\d{1,3})\s*(spots|available|open)\b/i);
  if (a) { const n = parseInt(a[1],10); if (n <= 200) return { open: n, cap: null }; }

  if (/sold\s*out/i.test(text)) return { open: 0, cap: null };
  return { open: null, cap: null };
}

async function scrapeHtml(url:string){
  const browser=await chromium.launch({headless:true});
  const ctx=await browser.newContext({userAgent:UA});
  const page=await ctx.newPage();
  await page.goto(url,{waitUntil:"networkidle",timeout:60000});
  const html=await page.content();
  await browser.close();
  return html;
}

function parseVendorGeneric(html:string, url:string, vesselNames:string[], landingId:string):Offer[]{
  const $=cheerio.load(html);
  const blocks = $("a, article, li, .card, .fh-item, .xola-activity, .booking-item, .trip, .row, .item")
    .toArray()
    .map(el => $(el).text().replace(/\s+/g," ").trim())
    .filter(t => t.includes("$"))
    .filter(t => /\b(day|hour|overnight|1\/2|3\/4)\b/i.test(t))   // must look like a trip
    .filter(t => !/charter\s*rates?/i.test(t));

  const out:Offer[]=[];
  for(const t of blocks){
    const priceCents=pickFareCents(t);
    const dep=parseDateSmart(t);
    if(!priceCents || !dep) continue;

    const len=parseLengthLabel(t);
    const ret=computeReturnsFromLength(dep,len);
    const {open,cap}=parseOccupancy(t);

    let vesselName: string | null = null;
    for(const n of vesselNames){ if(new RegExp(`\\b${n.replace(/[.*+?^${}()|[\\]\\\\]/g,"\\$&")}\\b`,"i").test(t)){vesselName=n; break;}}
    out.push({
      title:`${vesselName?`${vesselName} – `:""}${len??"Trip"}`,
      priceCents, currency:"USD", sourceUrl:url,
      departureDate:dep, returnsAt:ret, lengthLabel:len, loadLabel:null,
      summary:clean(t).slice(0,200),
      spotsOpen:open??null, capacity:cap??null,
      vesselName, landingId
    });
  }
  return dedup(out).slice(0,500);
}

async function resolveVesselId(landingId:string, vesselName?:string|null){
  if(!vesselName) return undefined;
  const list=await db.select().from(vessels).where(eq(vessels.landingId, landingId));
  const target=norm(vesselName);
  let best=list.find(v=>norm(v.name)===target) || list.find(v=>norm(v.name).includes(target)||target.includes(norm(v.name)));
  return best?.id;
}
async function getOrCreateVirtualVessel(landingId:string, pageUrl:string){
  const name="Landing Schedule";
  const existing = await db.select().from(vessels).where(and(eq(vessels.landingId,landingId), eq(vessels.name,name)));
  if(existing.length) return existing[0].id;
  const id=`virt_${landingId}`;
  await db.insert(vessels).values({ id, name, website:pageUrl, landingId, imageUrl:null }).onConflictDoNothing();
  return id;
}
async function upsertOffers(vesselId:string, items:Offer[]){
  for(const o of items){
    await db.insert(tripOffers).values({
      id: crypto.randomUUID(),
      vesselId,
      title: o.title,
      priceCents: o.priceCents,
      currency: o.currency ?? "USD",
      sourceUrl: o.sourceUrl,
      departureDate: o.departureDate ?? null,
      returnsAt: o.returnsAt ?? null,
      lengthLabel: o.lengthLabel ?? null,
      loadLabel: o.loadLabel ?? null,
      summary: o.summary ?? null,
      spotsOpen: o.spotsOpen ?? null,
      capacity: o.capacity ?? null,
      includeMeals: o.includeMeals ?? null,
      includePermits: o.includePermits ?? null,
    }).onConflictDoUpdate({
      target: [tripOffers.vesselId, tripOffers.departureDate, tripOffers.title],
      set: {
        lastSeenAt: sql`now()`,
        priceCents: o.priceCents ?? null,
        sourceUrl: o.sourceUrl,
        returnsAt: o.returnsAt ?? null,
        lengthLabel: o.lengthLabel ?? null,
        loadLabel: o.loadLabel ?? null,
        summary: o.summary ?? null,
        spotsOpen: o.spotsOpen ?? null,
        capacity: o.capacity ?? null,
        includeMeals: o.includeMeals ?? null,
        includePermits: o.includePermits ?? null,
      },
    });
  }
}

async function main(){
  console.log("[db] using URL:", process.env.DATABASE_URL);
  // vendors only
  const targets = await db.select().from(scrapeTargets)
    .where(and(eq(scrapeTargets.active,true), sql`${scrapeTargets.parser} in ('fareharbor','frn','xola','virtual_landing','custom')`));
  console.log(`Scraping ${targets.length} vendor targets from scrape_targets`);

  const byLanding: Record<string,string[]> = {};
  for (const t of targets) {
    const vs = await db.select().from(vessels).where(eq(vessels.landingId, t.landingId));
    byLanding[t.landingId] = vs.map(v=>v.name);
  }

  for (const t of targets) {
    await limiter.schedule(async () => {
      try{
        console.log(`→ ${t.url} [${t.parser}]`);
        const html = await scrapeHtml(t.url);
        const names = byLanding[t.landingId] || [];
        const offers = parseVendorGeneric(html, t.url, names, t.landingId);

        // group per (resolved or virtual) vessel
        const grouped: Record<string, Offer[]> = {};
        for (const o of offers) {
          const vid = await resolveVesselId(t.landingId, o.vesselName);
          const useVid = vid ?? await getOrCreateVirtualVessel(t.landingId, t.url);
          (grouped[useVid] ||= []).push(o);
        }
        let saved=0;
        for(const [vid,items] of Object.entries(grouped)){ await upsertOffers(vid, items); saved+=items.length; }
        console.log(`  saved ${saved} offers`);
      }catch(e:any){ console.error("  failed:", e?.message||e); }
    });
  }
}
main().catch(e=>{console.error(e);process.exit(1);});
