-- سفارش‌هایی که مدیر مستقیم از «در انتظار» به «ارسال/تحویل» برده بود زمان آماده‌سازی نداشتن؛
-- برای تایم‌لاین مشتری، زمانش رو (تقریبی) برابر زمان ارسال می‌ذاریم
UPDATE "orders"
SET "processing_at" = COALESCE("shipped_at", "delivered_at", "updated_at")
WHERE "processing_at" IS NULL AND "status" IN ('SHIPPING', 'DELIVERED');
