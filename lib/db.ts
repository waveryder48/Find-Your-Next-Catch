// lib/db.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// Load env lazily if nothing is set (works with tsx/PowerShell)
if (
    !process.env.DATABASE_URL &&
    !process.env.DRIZZLE_DATABASE_URL &&
    !process.env.DIRECT_URL
) {
    try {
        const { config } = await import("dotenv");
        const path = (await import("node:path")).default;
        // Try .env.local first, then .env
        config({ path: path.resolve(process.cwd(), ".env.local") });
        config();
    } catch {
        // dotenv optional—ignore if not installed
    }
}

const url =
    process.env.DATABASE_URL ||
    process.env.DRIZZLE_DATABASE_URL ||
    process.env.DIRECT_URL;

if (!url) {
    throw new Error(
        "Missing DATABASE_URL / DRIZZLE_DATABASE_URL / DIRECT_URL"
    );
}

// Auto-enable SSL for Supabase/pooler or when sslmode present
const needsSSL =
    /supabase\.co|pooler\.supabase\.com/i.test(url) ||
    /sslmode=(require|no-verify)/i.test(url);

const pool = new Pool({
    connectionString: url,
    ssl: needsSSL ? { rejectUnauthorized: false } : undefined,
});

export const db = drizzle(pool);

