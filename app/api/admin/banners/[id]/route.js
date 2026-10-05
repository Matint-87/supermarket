import { logActivity } from "@/lib/activity-log";
import { ApiError, handler, ok, pickProvided, readJson } from "@/lib/api";
import { requireApiAdmin, toPublicBanner } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { bannerSchema, uuidSchema } from "@/lib/schemas";

export const PATCH = handler(async (request, { params }) => {
  const admin = await requireApiAdmin();
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) throw new ApiError(400, "شناسه نامعتبر است");
  const raw = await readJson(request);
  const data = pickProvided(raw, bannerSchema.partial().parse(raw));

  const updated = await prisma.banner.update({ where: { id }, data }).catch(() => {
    throw new ApiError(404, "بنر پیدا نشد");
  });
  await logActivity(admin, { action: "UPDATE", entity: "BANNER", entityId: id, summary: `بنر «${updated.title}» ویرایش شد` });
  return ok({ banner: toPublicBanner(updated) });
});

export const DELETE = handler(async (_request, { params }) => {
  const admin = await requireApiAdmin();
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) throw new ApiError(400, "شناسه نامعتبر است");

  const deleted = await prisma.banner.delete({ where: { id } }).catch(() => {
    throw new ApiError(404, "بنر پیدا نشد");
  });
  await logActivity(admin, { action: "DELETE", entity: "BANNER", entityId: id, summary: `بنر «${deleted.title}» حذف شد` });
  return ok({});
});
