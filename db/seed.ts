// db/seed.ts
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' })

import { db } from './index';
import { landings, vessels } from './schema';
import xlsx from 'node-xlsx';
import fs from 'fs/promises';
import { randomUUID } from 'crypto';

const main = async () => {
    // If your file is in the project root:
    const [sheet] = xlsx.parse(await fs.readFile('landings_vessels.xlsx'));
    const rows = sheet.data.slice(1); // skip header

    const landingMap = new Map<string, { id: string; name: string; website: string }>();
    const landingRecords: { id: string; name: string; website: string }[] = [];
    const vesselRecords: { id: string; name: string; website: string; landingId: string }[] = [];

    for (const row of rows) {
        const [landingName, landingUrl, vesselName, vesselUrl] = row as [string, string, string, string];
        if (!landingName || !vesselName) continue;

        if (!landingMap.has(landingName)) {
            const landingId = `landing_${landingMap.size}`;
            const landing = { id: landingId, name: landingName.trim(), website: (landingUrl || '').trim() };
            landingMap.set(landingName, landing);
            landingRecords.push(landing);
        }

        const landingId = landingMap.get(landingName)!.id;
        vesselRecords.push({
            id: randomUUID(),
            name: vesselName.trim(),
            website: (vesselUrl || '').trim(),
            landingId,
        });
    }

    await db.insert(landings).values(landingRecords).onConflictDoNothing();
    await db.insert(vessels).values(vesselRecords).onConflictDoNothing();

    console.log('✅ Seed complete');
};

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
