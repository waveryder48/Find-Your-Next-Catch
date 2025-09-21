import "dotenv/config";
import * as xlsx from "node-xlsx";
import crypto from "node:crypto";
import { db } from "../db/index";
import { landings } from "../db/schema";
import { scrapeTargets } from "../db/schema.scrape";
import { eq, sql } from "drizzle-orm";

function mapVendor(raw?: string) {
  const s = (raw ?? "").toLowerCase();
  if (s.includes("fareharbor") || s.includes("fare harbor")) return "fareharbor";
  if (s.includes("frn") || s.includes("fishing reservation")) return "frn";
  if (s.includes("xola")) return "xola";
  if (s.includes("virtual")) return "virtual_landing";
  return "custom";
}

const norm = (s: string) =>
  s.toLowerCase().replace(/\s+/g, " ").trim();

// looser normalization: collapse “islands”→“island”, “sport fishing”→“sportfishing”
const normLoose = (s: string) =>
  norm(s)
    .replace(/\bsport\s+fishing\b/g, "sportfishing")
    .replace(/\bislands\b/g, "island");

const ALIASES: Record<string, string> = {
  "channel islands sportfishing": "channel island sportfishing",
  "channel islands sport fishing": "channel island sportfishing",
};

async function findLandingIdByName(name: string) {
  const rows = await db.select().from(landings);

  const targetRaw = norm(name);
  const targetAlias = ALIASES[targetRaw] || targetRaw;

  const tLoose = normLoose(targetAlias);

  const byExact = rows.find((r) => norm(r.name) === targetAlias);
  if (byExact) return byExact.id;

  const byLooseExact = rows.find((r) => normLoose(r.name) === tLoose);
  if (byLooseExact) return byLooseExact.id;

  const byIncludes =
    rows.find((r) => norm(r.name).includes(targetAlias) || targetAlias.includes(norm(r.name))) ||
    rows.find((r) => normLoose(r.name).includes(tLoose) || tLoose.includes(normLoose(r.name)));

  return byIncludes?.id;
}

function domainFrom(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; }
}

async function upsertTarget(landingId: string, url: string, vendor: string, note?: string) {
  const d = domainFrom(url);
  if (!d) return;

  await db.insert(scrapeTargets).values({
    id: crypto.randomUUID(),
    landingId,
    domain: d,
    url,
    parser: vendor,  // store vendor type here
    active: true,
    note: note ?? null,
  }).onConflictDoNothing();

  await db.update(scrapeTargets)
    .set({ landingId, domain: d, parser: vendor, active: true, note: note ?? null, updatedAt: sql`now()` })
    .where(eq(scrapeTargets.url, url));
}

async function main() {
  const path = process.argv[2] || "schedules_pages.xlsx";
  const wb = xlsx.parse(path);
  if (!wb.length) throw new Error("No sheets in the Excel file.");

  const data = wb[0].data as any[][];
  const rows = (typeof data[0]?.[0] === "string" && /landing/i.test(data[0][0])) ? data.slice(1) : data;

  let imported = 0, missing = 0;
  for (const r of rows) {
    if (!r || r.length < 2) continue;
    const landingName = String(r[0] ?? "").trim();
    const url = String(r[1] ?? "").trim();
    const vendor = mapVendor(String(r[2] ?? "").trim());
    const note = r[3] ? String(r[3]).trim() : undefined;
    if (!landingName || !url) continue;

    const landingId = await findLandingIdByName(landingName);
    if (!landingId) { console.warn("Landing not found:", landingName); missing++; continue; }

    await upsertTarget(landingId, url, vendor, note);
    imported++;
  }
  console.log(`Imported/updated ${imported} targets. Missing landings: ${missing}.`);
}
main().catch(e => { console.error(e); process.exit(1); });

