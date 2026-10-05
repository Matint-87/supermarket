import { handler, ok, readJson } from "@/lib/api";
import { logActivity } from "@/lib/activity-log";
import { fetchZonesPage, parseCursor } from "@/lib/admin-queries";
import { requireApiAdmin, toPublicZone } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { shippingZoneSchema } from "@/lib/schemas";

/** فقط ادمین: لیست محدوده‌های ارسال، ۱۰تا۱۰تا */
export const GET = handler(async (request) => {
  await requireApiAdmin();
  const sp = Object.fromEntries(new URL(request.url).searchParams);
  const { items, nextCursor, total } = await fetchZonesPage(parseCursor(sp.cursor));
  return ok({ zones: items, nextCursor, total });
});

export const POST = handler(async (request) => {
  const admin = await requireApiAdmin();
  const data = shippingZoneSchema.parse(await readJson(request));
  const created = await prisma.shippingZone.create({ data });
  await logActivity(admin, { action: "CREATE", entity: "SHIPPING_ZONE", entityId: created.id, summary: `محدوده‌ی ارسال «${created.name}» ساخته شد` });
  return ok({ zone: toPublicZone(created) }, { status: 201 });
});
