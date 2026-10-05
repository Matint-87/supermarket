#!/usr/bin/env node
// ساخت/تنظیم کاربر ادمین از خط فرمان.
//
//   node scripts/make-admin.mjs 09123456789            → این شماره رو ادمین می‌کنه (اگه کاربر نبود، می‌سازدش با رمز موقت)
//   node scripts/make-admin.mjs 09123456789 --revoke    → نقش رو به کاربر عادی برمی‌گردونه
//
// این اسکریپت lib/db.js رو import نمی‌کنه چون اون فایل با "server-only" علامت خورده و بیرون از Next.js اجرا نمی‌شه؛
// پس اتصال به دیتابیس رو مستقیماً همینجا با همون آداپتور می‌سازه.
import "dotenv/config";
import { randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.ts";
import { normalizeMobile } from "../lib/phone.js";

const scryptAsync = promisify(scrypt);

// همون پارامترها و فرمت lib/password.js (اون فایل server-only هست و اینجا قابل import نیست)
async function hashPassword(password) {
  const N = 2 ** 15, R = 8, P = 1, KEYLEN = 64;
  const salt = randomBytes(16);
  const hash = await scryptAsync(password.normalize("NFKC"), salt, KEYLEN, {
    N, r: R, p: P, maxmem: 128 * N * R * 2,
  });
  return ["scrypt", N, R, P, salt.toString("base64"), hash.toString("base64")].join("$");
}

async function main() {
  const args = process.argv.slice(2);
  const revoke = args.includes("--revoke");
  const phoneArg = args.find((a) => !a.startsWith("--"));

  if (!phoneArg) {
    console.error("استفاده: node scripts/make-admin.mjs 09123456789 [--revoke]");
    process.exit(1);
  }
  const phone = normalizeMobile(phoneArg);
  if (!phone) {
    console.error(`شماره «${phoneArg}» معتبر نیست.`);
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL تنظیم نشده (فایل .env رو بررسی کنید).");
    process.exit(1);
  }

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  try {
    const existing = await prisma.user.findUnique({ where: { phone } });
    const role = revoke ? "USER" : "ADMIN";

    if (existing) {
      await prisma.user.update({ where: { phone }, data: { role, isActive: true } });
      console.log(`✓ نقش کاربر ${phone} به ${role} تغییر کرد.`);
      return;
    }

    if (revoke) {
      console.error(`کاربری با شماره ${phone} پیدا نشد.`);
      process.exit(1);
    }

    // کاربر ادمین وجود نداشت؛ با یه رمز تصادفی می‌سازیمش (باید بعداً با «فراموشی رمز» عوضش کنه)
    const tempPassword = randomBytes(9).toString("base64url");
    const passwordHash = await hashPassword(tempPassword);

    await prisma.user.create({
      data: { phone, role: "ADMIN", passwordHash, phoneVerifiedAt: new Date() },
    });
    console.log(`✓ کاربر ادمین جدید ساخته شد: ${phone}`);
    console.log(`  رمز موقت: ${tempPassword}`);
    console.log("  (حتماً بعد از اولین ورود این رمز رو تغییر بده)");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("خطا:", err.message);
  process.exit(1);
});
