-- AlterTable
ALTER TABLE "orders"
  ADD COLUMN "tracking_code" TEXT,
  ADD COLUMN "shipped_at" TIMESTAMP(3),
  ADD COLUMN "delivered_at" TIMESTAMP(3);

-- سفارش‌های تحویل‌شده‌ی قبلی: زمان تحویل = آخرین تغییر
UPDATE "orders" SET "delivered_at" = "updated_at" WHERE "status" = 'DELIVERED';
-- سفارش‌هایی که الان «در حال ارسال» هستن: زمان شروع ارسال = آخرین تغییر
UPDATE "orders" SET "shipped_at" = "updated_at" WHERE "status" = 'SHIPPING';

-- CreateIndex
CREATE INDEX "orders_status_shipped_at_idx" ON "orders"("status", "shipped_at");
