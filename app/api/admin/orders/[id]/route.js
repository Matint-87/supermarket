import { logActivity } from "@/lib/activity-log";
import { ApiError, handler, ok, readJson } from "@/lib/api";
import { ORDER_STATUS_META, RESTOCK_STATUSES } from "@/lib/admin-constants";
import { requireApiAdmin, toPublicOrder } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { lockOrder } from "@/lib/finance";
import { formatToman } from "@/lib/format";
import { cancelOrder } from "@/lib/order-cancel";
import { adminOrderStatusSchema } from "@/lib/schemas";

/**
 * تغییر وضعیت سفارش (مدیر).
 *  • «لغو شده»: دلیل اجباریه؛ کالاها به انبار برمی‌گردن و پولِ پرداخت‌شده به کیف پول مشتری برمی‌گرده (lib/order-cancel.js).
 *  • «مرجوع شده»: کالاها به انبار برمی‌گردن؛ برگشت وجه دستی از بخش «مالی ← برگشت وجه» (روش «کیف پول») ثبت می‌شه.
 *  • سفارشِ لغوشده نهایی‌ه و دوباره فعال نمی‌شه (پولش به کیف پول برگشته؛ مشتری باید دوباره سفارش بده).
 */
export const PATCH = handler(async (request, { params }) => {
  const admin = await requireApiAdmin();
  const { id: code } = await params;
  if (!/^\d{8}$/.test(code)) throw new ApiError(400, "کد سفارش نامعتبر است");
  const { status, cancelReason } = adminOrderStatusSchema.parse(await readJson(request));

  const existing = await prisma.order.findUnique({ where: { code }, include: { items: true } });
  if (!existing) throw new ApiError(404, "سفارش پیدا نشد");
  if (existing.status === status) return ok({ order: toPublicOrder(existing), refunded: 0 });
  if (existing.status === "CANCELED") {
    throw new ApiError(409, "سفارش لغوشده دوباره فعال نمی‌شود؛ از مشتری بخواهید سفارش جدید ثبت کند.");
  }

  // ───── لغو ─────
  if (status === "CANCELED") {
    const { order, refunded } = await cancelOrder({ code, actor: "ADMIN", reason: cancelReason });
    await logActivity(admin, {
      action: "STATUS",
      entity: "ORDER",
      entityId: order.id,
      summary:
        `سفارش ${code} لغو شد (دلیل: ${cancelReason})` +
        (refunded > 0 ? ` — ${formatToman(refunded)} به کیف پول مشتری برگشت` : ""),
    });
    return ok({ order: toPublicOrder(order), refunded });
  }

  // ───── بقیه‌ی وضعیت‌ها ─────
  const wasRestocked = RESTOCK_STATUSES.includes(existing.status);
  const willRestock = RESTOCK_STATUSES.includes(status);

  const updated = await prisma.$transaction(async (tx) => {
    // قفل سفارش: هم‌زمان با پرداخت/لغو/کال‌بک درگاه اجرا نشه
    await lockOrder(tx, existing.id);
    // زمان ارسال/تحویل: با رفتن به «در حال ارسال» / «تحویل شده» ثبت می‌شه و با برگشت از اون وضعیت پاک می‌شه
    // processingAt (زمان «آماده‌سازی» در تایم‌لاین مشتری): اگه ادمین مستقیم از «در انتظار» به «ارسال/تحویل» بره،
    // مرحله‌ی آماده‌سازی رو هم با همون زمان ثبت می‌کنیم تا تایم‌لاین بدون ساعتِ خالی نمایش داده بشه
    const timestamps = {
      ...(status === "PENDING" && { processingAt: null, shippedAt: null, deliveredAt: null }),
      ...(status === "PROCESSING" && { processingAt: existing.processingAt ?? new Date(), shippedAt: null, deliveredAt: null }),
      ...(status === "SHIPPING" && { processingAt: existing.processingAt ?? new Date(), shippedAt: new Date(), deliveredAt: null }),
      ...(status === "DELIVERED" && {
        deliveredAt: new Date(),
        shippedAt: existing.shippedAt ?? new Date(),
        processingAt: existing.processingAt ?? existing.shippedAt ?? new Date(),
      }),
      ...(status === "RETURNED" && { deliveredAt: existing.deliveredAt }),
    };
    const claim = await tx.order.updateMany({
      where: { id: existing.id, status: existing.status },
      data: { status, ...timestamps },
    });
    if (claim.count === 0) {
      throw new ApiError(409, "وضعیت این سفارش هم‌زمان تغییر کرده است. صفحه را تازه کنید و دوباره تلاش کنید.");
    }

    if (!wasRestocked && willRestock) {
      for (const item of existing.items) {
        if (!item.productId) continue; // محصول بعداً حذف شده
        await tx.product.updateMany({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
      }
    } else if (wasRestocked && !willRestock) {
      for (const item of existing.items) {
        if (!item.productId) continue;
        const res = await tx.product.updateMany({
          where: { id: item.productId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (res.count === 0) {
          throw new ApiError(409, `موجودی «${item.name}» برای فعال‌کردن دوباره‌ی سفارش کافی نیست`);
        }
      }
    }
    return tx.order.findUnique({ where: { id: existing.id }, include: { items: true } });
  });

  await logActivity(admin, {
    action: "STATUS",
    entity: "ORDER",
    entityId: existing.id,
    summary: `وضعیت سفارش ${code} از «${ORDER_STATUS_META[existing.status].label}» به «${ORDER_STATUS_META[status].label}» تغییر کرد`,
  });

  return ok({ order: toPublicOrder(updated), refunded: 0 });
});
