// ساخت و ارسال اعلان‌ها. هر اعلان:
//   ۱) توی جدول notifications ذخیره می‌شه (تاریخچه + «خوانده‌نشده‌ها»، حتی اگه کاربر آفلاین بود)
//   ۲) با Postgres NOTIFY → SSE فوراً به مرورگرهای باز می‌رسه (toast + صدا)
//   ۳) با Web Push به دستگاه‌هایی که اعلان رو فعال کردن می‌رسه (حتی با سایت بسته)
// هیچ‌کدوم از تابع‌های اینجا خطا پرتاب نمی‌کنن: خرابیِ اعلان نباید ثبت سفارش یا تغییر وضعیت رو خراب کنه.
import "server-only";
import { randomUUID } from "node:crypto";
import { LOW_STOCK_THRESHOLD, ORDER_STATUS_META } from "@/lib/admin-constants";
import { prisma } from "@/lib/db";
import { formatNumber, formatToman } from "@/lib/format";
import { NOTIFICATION_RETENTION_DAYS } from "@/lib/notification-constants";
import { toFaDigits } from "@/lib/phone";
import { pushToUser } from "@/lib/push";
import { publish } from "@/lib/realtime";

const clip = (text, max) => (String(text).length > max ? `${String(text).slice(0, max - 1)}…` : String(text));

let lastPrune = 0;
async function pruneOld() {
  const now = Date.now();
  if (now - lastPrune < 6 * 3600_000) return;
  lastPrune = now;
  await prisma.notification.deleteMany({
    // پیام‌های دستی ادمین (broadcastId دارن) پاک نمی‌شن تا «دو تیک» ادمین بمونه؛ ادمین خودش حذفشون می‌کنه
    where: { broadcastId: null, readAt: { not: null }, createdAt: { lt: new Date(now - NOTIFICATION_RETENTION_DAYS * 86_400_000) } },
  });
  // اعلان‌هایی که کاربر خودش پاک کرده و دیگه به هیچ پیام دستی‌ای وصل نیستن
  await prisma.notification.deleteMany({ where: { broadcastId: null, dismissedAt: { lt: new Date(now - 7 * 86_400_000) } } });
}

/** یک اعلان برای یک کاربر */
export async function notifyUser(userId, { type, title, body, url = null }) {
  try {
    const row = await prisma.notification.create({
      data: { userId, type, title: clip(title, 120), body: clip(body, 300), url },
    });
    const notification = {
      id: row.id,
      type: row.type,
      title: row.title,
      body: row.body,
      url: row.url,
      readAt: null,
      createdAt: row.createdAt.toISOString(),
    };
    await publish(userId, notification).catch((err) => console.error("[notify:publish]", err.message));
    // پوش منتظر نمی‌مونه؛ سرویس‌های پوش گاهی چند ثانیه طول می‌کشن
    void pushToUser(userId, { title: row.title, body: row.body, url: row.url || "/", tag: row.id, type: row.type });
    void pruneOld().catch(() => {});
    return row;
  } catch (err) {
    console.error("[notify]", err);
    return null;
  }
}

/** یک اعلان برای همه‌ی ادمین‌های فعال */
export async function notifyAdmins(payload) {
  try {
    const admins = await prisma.user.findMany({ where: { role: "ADMIN", isActive: true }, select: { id: true } });
    await Promise.all(admins.map((a) => notifyUser(a.id, payload)));
  } catch (err) {
    console.error("[notify:admins]", err);
  }
}

const customerLabel = (u) => [u?.firstName, u?.lastName].filter(Boolean).join(" ") || (u?.phone ? toFaDigits(u.phone) : "مشتری");

// ───────────────────────── رویدادها ─────────────────────────

/**
 * بعد از ثبت موفق سفارش: «سفارش جدید» + هشدار کم‌شدن/تمام‌شدن موجودی کالاهایی که همین سفارش از آستانه عبورشون داد.
 * lines: [{ productId, name, quantity }]
 */
export async function announceNewOrder({ order, user, lines }) {
  try {
    await notifyAdmins({
      type: "ORDER_NEW",
      title: "سفارش جدید ثبت شد",
      body: `سفارش ${toFaDigits(order.code)} از ${customerLabel(user)} — ${formatToman(order.payable)}`,
      url: `/admin/orders/${order.code}`,
    });

    // موجودی بعد از کسر رو از دیتابیس می‌خونیم؛ «قبل از کسر» = بعد + تعداد همین سفارش
    const ids = lines.map((l) => l.productId).filter(Boolean);
    if (ids.length === 0) return;
    const fresh = await prisma.product.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, stock: true } });
    const byId = new Map(fresh.map((p) => [p.id, p]));
    for (const l of lines) {
      const p = byId.get(l.productId);
      if (!p) continue;
      const before = p.stock + l.quantity;
      if (p.stock === 0 && before > 0) {
        await notifyAdmins({
          type: "OUT_OF_STOCK",
          title: "موجودی کالا تمام شد",
          body: `«${clip(p.name, 60)}» ناموجود شد`,
          url: "/admin/products?status=out",
        });
      } else if (p.stock > 0 && p.stock <= LOW_STOCK_THRESHOLD && before > LOW_STOCK_THRESHOLD) {
        await notifyAdmins({
          type: "LOW_STOCK",
          title: "موجودی کالا کم شد",
          body: `«${clip(p.name, 60)}» — فقط ${formatNumber(p.stock)} عدد باقی مانده`,
          url: "/admin/products?status=low",
        });
      }
    }
  } catch (err) {
    console.error("[notify:new-order]", err);
  }
}

/** بعد از لغو سفارش: اگه مشتری لغو کرده → به ادمین؛ اگه ادمین لغو کرده → به مشتری */
export async function announceOrderCanceled({ order, actor, refunded = 0 }) {
  try {
    if (actor === "USER") {
      const user = await prisma.user.findUnique({
        where: { id: order.userId },
        select: { firstName: true, lastName: true, phone: true },
      });
      await notifyAdmins({
        type: "ORDER_CANCELED",
        title: "سفارش توسط مشتری لغو شد",
        body: `سفارش ${toFaDigits(order.code)} از ${customerLabel(user)} لغو شد — دلیل: ${clip(order.cancelReason ?? "", 120)}`,
        url: `/admin/orders/${order.code}`,
      });
    } else {
      await notifyUser(order.userId, {
        type: "ORDER_STATUS",
        title: "سفارش شما لغو شد",
        body:
          `سفارش ${toFaDigits(order.code)} لغو شد.` +
          (refunded > 0 ? ` ${formatToman(refunded)} به کیف پول شما برگشت.` : ""),
        url: `/profile?tab=orders&order=${order.code}`,
      });
    }
  } catch (err) {
    console.error("[notify:canceled]", err);
  }
}

/** بعد از تغییر وضعیت سفارش (ادمین یا تأیید خودکار تحویل): اعلان به مشتری */
export async function announceOrderStatus(order) {
  try {
    const code = toFaDigits(order.code);
    let title;
    let body;
    switch (order.status) {
      case "PROCESSING":
        title = "سفارش شما در حال آماده‌سازی است";
        body = `سفارش ${code} تأیید شد و همین الان در حال آماده‌سازی است.`;
        break;
      case "SHIPPING":
        if (order.shippingMethod === "PICKUP") {
          title = "سفارش شما آماده‌ی تحویل است";
          body = `سفارش ${code} آماده است؛ می‌توانید حضوری از فروشگاه تحویل بگیرید.`;
        } else {
          title = "سفارش شما ارسال شد";
          body = `سفارش ${code} تحویل ${order.shippingMethod === "COURIER" ? "پیک" : "پست"} شد.` +
            (order.trackingCode ? ` کد رهگیری: ${toFaDigits(order.trackingCode)}` : "");
        }
        break;
      case "DELIVERED":
        title = "سفارش شما تحویل داده شد";
        body = `سفارش ${code} تحویل شد. ممنون که از ما خرید کردید 🌿`;
        break;
      case "RETURNED":
        title = "سفارش شما مرجوع شد";
        body = `سفارش ${code} در وضعیت «${ORDER_STATUS_META.RETURNED.label}» قرار گرفت.`;
        break;
      default:
        return; // PENDING (بازگشت به «در انتظار») و CANCELED (جدا هندل می‌شه) اعلان ندارن
    }
    await notifyUser(order.userId, { type: "ORDER_STATUS", title, body, url: `/profile?tab=orders&order=${order.code}` });
  } catch (err) {
    console.error("[notify:status]", err);
  }
}

/** ثبت یا تغییر کد رهگیری پستی */
export async function announceTrackingCode(order) {
  if (!order.trackingCode) return;
  await notifyUser(order.userId, {
    type: "ORDER_STATUS",
    title: "کد رهگیری سفارش شما ثبت شد",
    body: `کد رهگیری سفارش ${toFaDigits(order.code)}: ${toFaDigits(order.trackingCode)}`,
    url: `/profile?tab=orders&order=${order.code}`,
  });
}

/**
 * پیام دستی ادمین: به همه‌ی مشتری‌های فعال (ALL) یا چند کاربر انتخاب‌شده (SELECTED).
 * هر گیرنده یک Notification جدا می‌گیره (برای «خوانده شد» هر نفر) و همه به یک NotificationBroadcast وصل‌ان.
 * خروجی: { broadcast, recipientCount }
 */
export async function sendBroadcast(admin, { title, body, url = null, audience, userIds = [] }) {
  const recipients = await prisma.user.findMany({
    where: audience === "ALL" ? { role: "USER", isActive: true } : { id: { in: userIds }, isActive: true },
    select: { id: true },
  });
  if (recipients.length === 0) return { broadcast: null, recipientCount: 0 };

  const adminName = [admin.firstName, admin.lastName].filter(Boolean).join(" ") || admin.phone;
  const cleanTitle = clip(title, 120);
  const cleanBody = clip(body, 300);
  const createdAt = new Date();

  const broadcast = await prisma.notificationBroadcast.create({
    data: {
      adminId: admin.id,
      adminName,
      title: cleanTitle,
      body: cleanBody,
      url,
      audience,
      recipientCount: recipients.length,
    },
  });

  // id رو خودمون می‌سازیم تا بعد از createMany بدون کوئری اضافه بتونیم SSE/پوش بفرستیم
  const rows = recipients.map((r) => ({ id: randomUUID(), userId: r.id }));
  for (let i = 0; i < rows.length; i += 1000) {
    await prisma.notification.createMany({
      data: rows.slice(i, i + 1000).map((r) => ({
        id: r.id,
        userId: r.userId,
        broadcastId: broadcast.id,
        type: "ADMIN_MESSAGE",
        title: cleanTitle,
        body: cleanBody,
        url,
        createdAt,
      })),
    });
  }

  // تحویل لحظه‌ای (SSE + پوش) در پس‌زمینه و با همزمانیِ محدود؛ ارسال پیام منتظرش نمی‌مونه
  void (async () => {
    const BATCH = 25;
    for (let i = 0; i < rows.length; i += BATCH) {
      await Promise.all(
        rows.slice(i, i + BATCH).map(async (r) => {
          const notification = {
            id: r.id,
            type: "ADMIN_MESSAGE",
            title: cleanTitle,
            body: cleanBody,
            url,
            readAt: null,
            createdAt: createdAt.toISOString(),
          };
          await publish(r.userId, notification).catch((err) => console.error("[broadcast:publish]", err.message));
          await pushToUser(r.userId, { title: cleanTitle, body: cleanBody, url: url || "/", tag: r.id, type: "ADMIN_MESSAGE" });
        }),
      );
    }
  })().catch((err) => console.error("[broadcast:deliver]", err));

  return { broadcast, recipientCount: recipients.length };
}
