import { logActivity } from "@/lib/activity-log";
import { ApiError, handler, ok, readJson } from "@/lib/api";
import { toAdminUser } from "@/lib/admin-dal";
import { fetchUsersPage, parseCursor, parseUserFilters } from "@/lib/admin-queries";
import { requireApiAdmin } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { adminUserCreateSchema } from "@/lib/schemas";

/** فقط ادمین: لیست کاربران، ۱۰تا۱۰تا (cursor = id آخرین کاربر صفحه‌ی قبل) + فیلترهای q, role, status */
export const GET = handler(async (request) => {
  await requireApiAdmin();
  const sp = Object.fromEntries(new URL(request.url).searchParams);
  const { items, nextCursor, total } = await fetchUsersPage(parseUserFilters(sp), parseCursor(sp.cursor));
  return ok({ users: items, nextCursor, total });
});

/** فقط ادمین: ساخت کاربر جدید (کاربر بعداً با کد پیامکی وارد می‌شه و خودش رمز می‌ذاره) */
export const POST = handler(async (request) => {
  const admin = await requireApiAdmin();
  const data = adminUserCreateSchema.parse(await readJson(request));

  if (await prisma.user.findUnique({ where: { phone: data.phone } })) {
    throw new ApiError(409, "کاربری با این شماره موبایل وجود دارد", {
      fields: { phone: "این شماره قبلاً ثبت شده است" },
    });
  }
  if (data.email && (await prisma.user.findUnique({ where: { email: data.email } }))) {
    throw new ApiError(409, "این ایمیل قبلاً برای کاربر دیگری ثبت شده است", {
      fields: { email: "این ایمیل قبلاً ثبت شده است" },
    });
  }

  try {
    const created = await prisma.user.create({
      data: {
        ...data,
        // همون قاعده‌ی /api/profile: با ثبت نام و نام خانوادگی، پروفایل «تکمیل‌شده» حساب می‌شه
        profileCompletedAt: data.firstName && data.lastName ? new Date() : null,
      },
      include: { _count: { select: { orders: true } } },
    });
    await logActivity(admin, { action: "CREATE", entity: "USER", entityId: created.id, summary: `کاربر ${created.phone} ساخته شد` });
    return ok({ user: toAdminUser(created) }, { status: 201 });
  } catch (err) {
    if (err?.code === "P2002") throw new ApiError(409, "شماره موبایل یا ایمیل تکراری است");
    throw err;
  }
});
