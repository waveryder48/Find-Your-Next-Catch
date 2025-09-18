import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

import type { Config } from "drizzle-kit";

const url = process.env.DRIZZLE_DATABASE_URL ?? process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL/DRIZZLE_DATABASE_URL not set");

export default {
    schema: "./drizzle/schema.ts",
    out: "./drizzle/migrations",
    dialect: "postgresql",
    dbCredentials: { url },
    strict: false,   // <— important: do NOT drop/alter unknown tables/cols
    verbose: true,
} satisfies Config;
