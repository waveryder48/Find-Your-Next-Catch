import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient | null = null;

export function getPrisma() {
  // If no DATABASE_URL on Vercel, run in "mock mode" (no DB)
  if (!process.env.DATABASE_URL) return null;
  if (!prisma) prisma = new PrismaClient();
  return prisma;
}
