import { logActivity } from "@/lib/activity-log";
import { ApiError, handler, ok, readJson } from "@/lib/api";
import { MAX_BANNERS } from "@/lib/admin-constants";
import { getAllBanners } from "@/lib/banners";
import { requireApiAdmin, toPublicBanner } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { bannerSchema } from "@/lib/schemas";

/** فقط ادمین: همه‌ی بنرها به ترتیب نمایش */
export const GET = handler(async () => {
  await requireApiAdmin();
  return ok({ banners: await getAllBanners() });
});

/** فقط ادمین: بنر جدید (عکس رو قبلش با /api/admin/banners/upload آپلود کن). آخر لیست اضافه می‌شه. */
export const POST = handler(async (request) => {
  const admin = await requireApiAdmin();
  const data = bannerSchema.parse(await readJson(request));

  const count = await prisma.banner.count();
  if (count >= MAX_BANNERS) {
    throw new ApiError(409, `حداکثر ${MAX_BANNERS.toLocaleString("fa-IR")} بنر می‌توانید داشته باشید. یکی از بنرها را حذف کنید.`);
  }
  const last = await prisma.banner.findFirst({ orderBy: { sortOrder: "desc" }, select: { sortOrder: true } });

  const created = await prisma.banner.create({ data: { ...data, sortOrder: (last?.sortOrder ?? -1) + 1 } });
  await logActivity(admin, { action: "CREATE", entity: "BANNER", entityId: created.id, summary: `بنر «${created.title}» اضافه شد` });
  return ok({ banner: toPublicBanner(created) }, { status: 201 });
});
