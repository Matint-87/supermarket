import { timingSafeEqual } from "node:crypto";
import { ApiError, handler, ok } from "@/lib/api";
import { autoDeliverOverdue } from "@/lib/order-delivery";

/**
 * فراخوانی دوره‌ای (مثلاً هر ساعت با cron سرور):
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://your-site/api/cron/auto-deliver
 * بدون CRON_SECRET در env این مسیر غیرفعاله.
 */
export const GET = handler(async (request) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) throw new ApiError(404, "پیدا نشد");
  const given = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new ApiError(401, "مجاز نیست");
  const delivered = await autoDeliverOverdue({ force: true });
  return ok({ delivered });
});
