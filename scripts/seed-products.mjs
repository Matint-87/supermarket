#!/usr/bin/env node
// پر کردن دیتابیس با چند دسته و ۱۸ محصول فیک برای تست صفحه‌ی محصولات.
//
//   node scripts/seed-products.mjs
//
// این اسکریپت lib/db.js رو import نمی‌کنه چون اون فایل با "server-only" علامت خورده و بیرون از Next.js اجرا نمی‌شه؛
// پس اتصال به دیتابیس رو مستقیماً همینجا با همون آداپتور می‌سازه (مثل scripts/make-admin.mjs).
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.ts";

const CATEGORIES = ["تنقلات", "لبنیات و بستنی", "نوشیدنی", "خواربار و نان"];

// ۱۸ محصول فیک؛ هر کدوم یه دسته (از روی نام)، واحد، مقدار، قیمت پایه، درصد تخفیف و موجودی
const PRODUCTS = [
  { name: "شکلات تلخ گالاردو ۸۳٪", category: "تنقلات", unit: "GRAM", amount: 80, price: 283575, discountPercent: 5, stock: 40 },
  { name: "پاپ کرن کچاپ مزمز", category: "تنقلات", unit: "GRAM", amount: 60, price: 90000, discountPercent: 5, stock: 60 },
  { name: "بیسکویت تارت قلبی نیکا با طعم کاکائویی", category: "تنقلات", unit: "GRAM", amount: 64, price: 45000, discountPercent: 0, stock: 35 },
  { name: "بیسکویت کرمدار نارگیلی شیرین‌عسل", category: "تنقلات", unit: "GRAM", amount: 120, price: 40000, discountPercent: 0, stock: 50 },
  { name: "تافی مغزدار ترش المان", category: "تنقلات", unit: "GRAM", amount: 300, price: 245000, discountPercent: 0, stock: 25 },
  { name: "شکلات آسکام دبی بار", category: "تنقلات", unit: "GRAM", amount: 33, price: 65000, discountPercent: 0, stock: 70 },
  { name: "شیر پرچرب پگاه", category: "لبنیات و بستنی", unit: "LITER", amount: 1, price: 62000, discountPercent: 10, stock: 80 },
  { name: "ماست کم‌چرب کاله", category: "لبنیات و بستنی", unit: "GRAM", amount: 900, price: 78000, discountPercent: 0, stock: 45 },
  { name: "پنیر سفید ایرانی میهن", category: "لبنیات و بستنی", unit: "GRAM", amount: 400, price: 145000, discountPercent: 15, stock: 30 },
  { name: "بستنی وانیلی میهن", category: "لبنیات و بستنی", unit: "BOX", amount: 1, price: 98000, discountPercent: 0, stock: 20 },
  { name: "کره حیوانی کاله", category: "لبنیات و بستنی", unit: "GRAM", amount: 100, price: 89000, discountPercent: 0, stock: 55 },
  { name: "نوشابه کوکاکولا", category: "نوشیدنی", unit: "LITER", amount: 1.5, price: 55000, discountPercent: 0, stock: 100 },
  { name: "آب‌معدنی دماوند", category: "نوشیدنی", unit: "LITER", amount: 1.5, price: 15000, discountPercent: 0, stock: 200 },
  { name: "دوغ گازدار خوشگوار", category: "نوشیدنی", unit: "LITER", amount: 1, price: 42000, discountPercent: 5, stock: 60 },
  { name: "آب‌پرتقال طبیعی سن‌ایچ", category: "نوشیدنی", unit: "LITER", amount: 1, price: 78000, discountPercent: 0, stock: 40 },
  { name: "نان باگت تست", category: "خواربار و نان", unit: "PIECE", amount: 1, price: 35000, discountPercent: 0, stock: 90 },
  { name: "برنج طارم هاشمی درجه یک", category: "خواربار و نان", unit: "KILOGRAM", amount: 1, price: 185000, discountPercent: 0, stock: 40 },
  { name: "روغن مایع آفتابگردان لادن", category: "خواربار و نان", unit: "LITER", amount: 1.5, price: 210000, discountPercent: 8, stock: 35 },
];

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL تنظیم نشده (فایل .env رو بررسی کنید).");
    process.exit(1);
  }

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter });

  try {
    // دسته‌ها رو یا پیدا کن یا بساز
    const categoryIdByName = {};
    for (const [index, name] of CATEGORIES.entries()) {
      const category = await prisma.category.upsert({
        where: { name },
        update: {},
        create: { name, sortOrder: index },
      });
      categoryIdByName[name] = category.id;
    }
    console.log(`✓ ${CATEGORIES.length} دسته آماده شد.`);

    let created = 0;
    for (const p of PRODUCTS) {
      await prisma.product.create({
        data: {
          categoryId: categoryIdByName[p.category],
          name: p.name,
          unit: p.unit,
          amount: p.amount,
          price: p.price,
          discountPercent: p.discountPercent,
          stock: p.stock,
        },
      });
      created += 1;
    }
    console.log(`✓ ${created} محصول فیک ساخته شد.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("خطا:", err.message);
  process.exit(1);
});
