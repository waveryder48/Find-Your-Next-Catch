// src/server/prisma.ts
import { PrismaClient } from "@prisma/client";

// single instance across dev hot-reloads
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        // log: ["query"], // uncomment if you want query logs
    });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
