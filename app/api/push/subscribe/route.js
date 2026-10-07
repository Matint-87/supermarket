import { z } from "zod";
import { ApiError, handler, ok, readJson } from "@/lib/api";
import { requireApiUser } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { pushEnabled, vapidPublicKey } from "@/lib/push";

const subscribeSchema = z.object({
  endpoint: z.string().url().max(1000),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
});
const unsubscribeSchema = z.object({ endpoint: z.string().url().max(1000) });

/** کلید عمومی VAPID برای subscribe کردن مرورگر (اگه پوش روی سرور تنظیم نشده enabled=false) */
export const GET = handler(async () => {
  await requireApiUser();
  return ok({ enabled: pushEnabled(), publicKey: vapidPublicKey() });
});

/** ثبت (یا انتقال به کاربر جاری) اشتراک پوش این دستگاه */
export const POST = handler(async (request) => {
  const user = await requireApiUser();
  if (!pushEnabled()) throw new ApiError(503, "اعلان پوش روی سرور فعال نشده است");
  const { endpoint, keys } = subscribeSchema.parse(await readJson(request));
  const userAgent = (request.headers.get("user-agent") || "").slice(0, 300) || null;
  // اگه همین دستگاه قبلاً با حساب دیگری ثبت شده بود، به کاربر فعلی منتقل می‌شه
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { userId: user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth, userAgent },
    update: { userId: user.id, p256dh: keys.p256dh, auth: keys.auth, userAgent },
  });
  return ok({});
});

/** حذف اشتراک این دستگاه (موقع خروج از حساب یا خاموش‌کردن اعلان) */
export const DELETE = handler(async (request) => {
  const user = await requireApiUser();
  const { endpoint } = unsubscribeSchema.parse(await readJson(request));
  await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: user.id } });
  return ok({});
});
