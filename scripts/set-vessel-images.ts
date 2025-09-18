import "dotenv/config";
import { db } from "../db/index";
import { vessels } from "../db/schema";
import { eq } from "drizzle-orm";

const imgs: Record<string, string> = {
  // "Exact Vessel Name" : "https://your.cdn/path.jpg",
  // e.g. "Pacific Queen": "https://…/pacific-queen.jpg",
};

async function main() {
  const vs = await db.select().from(vessels);
  for (const v of vs) {
    const url = imgs[v.name];
    if (!url) continue;
    await db.update(vessels).set({ imageUrl: url }).where(eq(vessels.id, v.id));
    console.log("set image:", v.name);
  }
}
main();
