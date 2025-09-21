import "dotenv/config";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

const connectionString =
    process.env.DIRECT_URL || process.env.DATABASE_URL || process.env.DRIZZLE_DATABASE_URL;

if (!connectionString) throw new Error("Missing DB URL");

async function main() {
    const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
    const db = drizzle(pool);
    await migrate(db, { migrationsFolder: "drizzle" });
    await pool.end();
    console.log("✅ Migrations applied");
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
