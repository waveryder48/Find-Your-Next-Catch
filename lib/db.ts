import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL!;
const sslNeeded =
    /sslmode=(require|no-verify)/i.test(connectionString) || /supabase\.(co|com)/i.test(connectionString);

export const db = drizzle(new Pool({
    connectionString,
    max: 5,
    ssl: sslNeeded ? { rejectUnauthorized: false } : undefined,
}));
