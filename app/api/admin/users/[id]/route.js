import { logActivity } from "@/lib/activity-log";
import { ApiError, handler, ok, pickProvided, readJson } from "@/lib/api";
import { toAdminUser } from "@/lib/admin-dal";
import { requireApiAdmin } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { adminUserUpdateSchema, uuidSchema } from "@/lib/schemas";
import { deleteImage } from "@/lib/storage";

// پاک‌کردن عکس پروفایل (Blob یا فایل محلی) — جزئیات توی lib/storage.js
const deleteAvatarFile = (url) => deleteImage(url, "avatars");

async function readId(ctx) {
  const { id } = await ctx.params;
  if (!uuidSchema.safeParse(id).success) throw new ApiError(400, "شناسه نامعتبر است");
  return id;
}

export const PATCH = handler(async (request, ctx) => {
  const admin = await requireApiAdmin();
  const id = await readId(ctx);
  const raw = await readJson(request);
  const data = pickProvided(raw, adminUserUpdateSchema.parse(raw));

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) throw new ApiError(404, "کاربر پیدا نشد");

  // ادمین نمی‌تونه خودش رو تنزل بده یا مسدود کنه؛ همین قاعده تضمین می‌کنه همیشه حداقل یک ادمین فعال بمونه
  if (target.id === admin.id) {
    if (data.role !== undefined && data.role !== "ADMIN") {
      throw new ApiError(400, "نقش حساب خودتان را نمی‌توانید تغییر دهید", { fields: { role: "غیرقابل تغییر" } });
    }
    if (data.isActive === false) {
      throw new ApiError(400, "حساب خودتان را نمی‌توانید مسدود کنید");
    }
  }

  if (data.phone && data.phone !== target.phone) {
    if (await prisma.user.findUnique({ where: { phone: data.phone } })) {
      throw new ApiError(409, "کاربری با این شماره موبایل وجود دارد", {
        fields: { phone: "این شماره قبلاً ثبت شده است" },
      });
    }
  }
  if (data.email && data.email !== target.email) {
    if (await prisma.user.findUnique({ where: { email: data.email } })) {
      throw new ApiError(409, "این ایمیل قبلاً برای کاربر دیگری ثبت شده است", {
        fields: { email: "این ایمیل قبلاً ثبت شده است" },
      });
    }
  }

  const update = { ...data };

  // تغییر نقش، مسدودسازی یا تغییر شماره → نشست‌های قبلی کاربر باطل بشن
  const sessionAffected =
    (data.role !== undefined && data.role !== target.role) ||
    (data.isActive === false && target.isActive) ||
    (data.phone !== undefined && data.phone !== target.phone);
  if (sessionAffected) update.tokenVersion = { increment: 1 };

  const firstName = data.firstName !== undefined ? data.firstName : target.firstName;
  const lastName = data.lastName !== undefined ? data.lastName : target.lastName;
  if (!target.profileCompletedAt && firstName && lastName) update.profileCompletedAt = new Date();

  try {
    const updated = await prisma.user.update({
      where: { id },
      data: update,
      include: { _count: { select: { orders: true } } },
    });
    const statusChange = data.isActive !== undefined && data.isActive !== target.isActive;
    await logActivity(admin, {
      action: statusChange ? "STATUS" : "UPDATE",
      entity: "USER",
      entityId: id,
      summary: statusChange
        ? `حساب ${updated.phone} ${updated.isActive ? "فعال" : "مسدود"} شد`
        : `اطلاعات کاربر ${updated.phone} ویرایش شد`,
    });
    return ok({ user: toAdminUser(updated) });
  } catch (err) {
    if (err?.code === "P2002") throw new ApiError(409, "شماره موبایل یا ایمیل تکراری است");
    throw err;
  }
});

export const DELETE = handler(async (_request, ctx) => {
  const admin = await requireApiAdmin();
  const id = await readId(ctx);

  if (id === admin.id) throw new ApiError(400, "حساب خودتان را نمی‌توانید حذف کنید");

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) throw new ApiError(404, "کاربر پیدا نشد");

  // سفارش‌ها سابقه‌ی مالی‌ان و به کاربر وصل‌اند؛ برای این کاربرها «مسدودسازی» درسته نه حذف
  const orderCount = await prisma.order.count({ where: { userId: id } });
  if (orderCount > 0) {
    throw new ApiError(
      409,
      `این کاربر ${orderCount} سفارش ثبت کرده و قابل حذف نیست. به‌جای حذف، حساب او را مسدود کنید.`,
    );
  }

  await prisma.$transaction([
    prisma.otpCode.deleteMany({ where: { phone: target.phone } }),
    prisma.user.delete({ where: { id } }), // آدرس‌ها با cascade پاک می‌شن
  ]);
  await deleteAvatarFile(target.avatarUrl);
  await logActivity(admin, { action: "DELETE", entity: "USER", entityId: id, summary: `کاربر ${target.phone} حذف شد` });

  return ok({});
});
