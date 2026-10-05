-- AlterTable: زمان شروع آماده‌سازی (برای تایم‌لاین پیگیری سفارش)
ALTER TABLE "orders" ADD COLUMN "processing_at" TIMESTAMP(3);

-- سفارش‌های قبلی (تقریبی): در حال آماده‌سازی = آخرین تغییر؛ ارسال‌شده/تحویل‌شده = زمان ارسال
UPDATE "orders" SET "processing_at" = "updated_at" WHERE "status" = 'PROCESSING';
UPDATE "orders" SET "processing_at" = COALESCE("shipped_at", "updated_at") WHERE "status" IN ('SHIPPING', 'DELIVERED');
