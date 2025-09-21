import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
console.log('[db] using URL:', process.env.DATABASE_URL);
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set (.env.local)");
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Supabase pooler uses a self-signed cert; skip CA verification
    ssl: { rejectUnauthorized: false },
});

export const db = drizzle(pool, { schema });

