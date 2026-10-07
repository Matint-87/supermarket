import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// در حالت dev هر بار که فایل‌ها reload می‌شن نباید یه کانکشن پول جدید ساخته بشه
const globalForPrisma = globalThis;

function createClient() {
  if (!process.env.DATABASE_URL) {
    throw new Error("متغیر محیطی DATABASE_URL تنظیم نشده (فایل .env).");
  }
  // روی Vercel هر instance تابع یک pool جدا می‌سازه؛ pool کوچک جلوی تمام‌شدن سقف اتصال‌های Postgres رو می‌گیره
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    max: Number(process.env.DB_POOL_MAX) || 3,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.__prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__prisma = prisma;
}
