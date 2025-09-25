import { readFile } from "fs/promises";
import xlsx from "xlsx";

import { db } from "../db";
import { landings } from "../db/schema";
import { eq } from "drizzle-orm";

async function main() {
    const file = xlsx.readFile("./schedules_pages.xlsx");
    const sheet = file.Sheets[file.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet) as {
        "Landing Name": string;
        "Booking URL": string;
    }[];

    for (const row of rows) {
        const name = row["Landing Name"].trim();
        const url = row["Booking URL"]?.trim();
        if (!name || !url) continue;

        await db
            .update(landings)
            .set({ websiteUrl: url })
            .where(eq(landings.name, name))
            .execute();

        console.log(`✅ Updated: ${name}`);
    }

    console.log("🌐 All website URLs imported.");
}

main().catch((err) => {
    console.error("❌ Error:", err);
    process.exit(1);
});
