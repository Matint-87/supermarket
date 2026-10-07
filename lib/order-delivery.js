// تأیید خودکار تحویل: سفارش‌هایی که بیش از مدت مجاز «در حال ارسال» مونده‌ن → «تحویل‌شده».
// بدون نیاز به cron: صفحه‌ی سفارش‌های ادمین و لیست سفارش‌های مشتری هر بار (حداکثر دقیقه‌ای یک‌بار) این رو صدا می‌زنن؛
// برای دقت بیشتر هم می‌شه /api/cron/auto-deliver رو با cron سرور صدا زد (CRON_SECRET).
import "server-only";
import { prisma } from "@/lib/db";
import { announceOrderStatus } from "@/lib/notify";
import { AUTO_DELIVER_AFTER_HOURS } from "@/lib/order-constants";

let lastRun = 0;
const THROTTLE_MS = 60_000;

/** تعداد سفارش‌هایی که خودکار تحویل‌شده شدن */
export async function autoDeliverOverdue({ force = false } = {}) {
  const now = Date.now();
  if (!force && now - lastRun < THROTTLE_MS) return 0;
  lastRun = now;

  let total = 0;
  try {
    for (const [method, hours] of Object.entries(AUTO_DELIVER_AFTER_HOURS)) {
      if (!hours) continue;
      const due = await prisma.order.findMany({
        where: { status: "SHIPPING", shippingMethod: method, shippedAt: { lt: new Date(now - hours * 3600_000) } },
        select: { id: true },
      });
      if (due.length === 0) continue;
      const ids = due.map((o) => o.id);
      const res = await prisma.order.updateMany({
        where: { id: { in: ids }, status: "SHIPPING" },
        data: { status: "DELIVERED", deliveredAt: new Date(now) },
      });
      total += res.count;
      // فقط سفارش‌هایی که همین الان واقعاً تحویل‌شده شدن (deliveredAt دقیقاً همین لحظه) به مشتری اعلان می‌دن
      const done = await prisma.order.findMany({ where: { id: { in: ids }, status: "DELIVERED", deliveredAt: new Date(now) } });
      for (const o of done) await announceOrderStatus(o);
    }
  } catch (err) {
    // خطا نباید صفحه‌ی اصلی رو خراب کنه
    console.error("[auto-deliver]", err);
  }
  return total;
}
