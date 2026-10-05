import { logActivity } from "@/lib/activity-log";
import { ApiError, handler, ok, readJson } from "@/lib/api";
import { requireApiAdmin } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { bannerOrderSchema } from "@/lib/schemas";

/** فقط ادمین: ترتیب جدید نمایش بنرها. ids = شناسه‌ی همه‌ی بنرها به ترتیب دلخواه. */
export const POST = handler(async (request) => {
  const admin = await requireApiAdmin();
  const { ids } = bannerOrderSchema.parse(await readJson(request));
  if (new Set(ids).size !== ids.length) throw new ApiError(400, "درخواست نامعتبر است");

  const existing = await prisma.banner.findMany({ select: { id: true } });
  if (existing.length !== ids.length || !existing.every((b) => ids.includes(b.id))) {
    throw new ApiError(409, "فهرست بنرها تغییر کرده است. صفحه را تازه کنید و دوباره تلاش کنید.");
  }

  await prisma.$transaction(ids.map((id, i) => prisma.banner.update({ where: { id }, data: { sortOrder: i } })));
  await logActivity(admin, { action: "UPDATE", entity: "BANNER", summary: "ترتیب نمایش بنرها تغییر کرد" });
  return ok({});
});
