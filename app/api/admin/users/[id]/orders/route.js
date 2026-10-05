import { ApiError, handler, ok } from "@/lib/api";
import { fetchUserOrdersPaged } from "@/lib/admin-queries";
import { requireApiAdmin } from "@/lib/dal";
import { uuidSchema } from "@/lib/schemas";

/** فقط ادمین: سفارش‌های یک کاربر با جست‌وجو (q)، فیلتر روز (from/to) و صفحه‌بندی (page/size) */
export const GET = handler(async (request, ctx) => {
  await requireApiAdmin();
  const { id } = await ctx.params;
  if (!uuidSchema.safeParse(id).success) throw new ApiError(400, "شناسه نامعتبر است");
  const sp = Object.fromEntries(new URL(request.url).searchParams);
  const { items, total, page, pages, size } = await fetchUserOrdersPaged(id, sp);
  return ok({ orders: items, total, page, pages, size });
});
