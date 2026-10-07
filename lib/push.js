// ارسال Web Push به مرورگرها/گوشی‌ها (حتی وقتی سایت بسته‌ست).
// کلیدهای VAPID رو یک‌بار با «npm run generate-vapid» بساز و توی .env بذار؛ بدونشون پوش غیرفعاله ولی اعلان درون‌برنامه کار می‌کنه.
import "server-only";
import webpush from "web-push";
import { prisma } from "@/lib/db";

let configured = null;

export function pushEnabled() {
  if (configured !== null) return configured;
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return (configured = false);
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:admin@example.com", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  return (configured = true);
}

export function vapidPublicKey() {
  return pushEnabled() ? process.env.VAPID_PUBLIC_KEY : null;
}

/** پوش به همه‌ی دستگاه‌های یک کاربر. اشتراک‌های منقضی‌شده (404/410) خودکار پاک می‌شن. هیچ‌وقت خطا پرتاب نمی‌کنه. */
export async function pushToUser(userId, payload) {
  if (!pushEnabled()) return;
  try {
    const subs = await prisma.pushSubscription.findMany({ where: { userId } });
    if (subs.length === 0) return;
    const body = JSON.stringify(payload);
    const dead = [];
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            body,
            { TTL: 60 * 60 * 24, urgency: "high" },
          );
        } catch (err) {
          if (err?.statusCode === 404 || err?.statusCode === 410) dead.push(s.id);
          else console.error("[push]", err?.statusCode ?? "", err?.message ?? err);
        }
      }),
    );
    if (dead.length) await prisma.pushSubscription.deleteMany({ where: { id: { in: dead } } });
  } catch (err) {
    console.error("[push]", err);
  }
}
