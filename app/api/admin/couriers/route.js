import { handler, ok, readJson } from "@/lib/api";
import { logActivity } from "@/lib/activity-log";
import { fetchCouriersPage, parseCourierFilters, parseCursor } from "@/lib/admin-queries";
import { requireApiAdmin, toPublicCourier } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { courierSchema } from "@/lib/schemas";

/** فقط ادمین: لیست پیک‌ها، ۱۰تا۱۰تا + فیلترهای q و status */
export const GET = handler(async (request) => {
  await requireApiAdmin();
  const sp = Object.fromEntries(new URL(request.url).searchParams);
  const { items, nextCursor, total } = await fetchCouriersPage(parseCourierFilters(sp), parseCursor(sp.cursor));
  return ok({ couriers: items, nextCursor, total });
});

export const POST = handler(async (request) => {
  const admin = await requireApiAdmin();
  const data = courierSchema.parse(await readJson(request));
  const created = await prisma.courier.create({ data });
  await logActivity(admin, { action: "CREATE", entity: "COURIER", entityId: created.id, summary: `پیک «${created.name}» اضافه شد` });
  return ok({ courier: { ...toPublicCourier(created), orderCount: 0 } }, { status: 201 });
});
