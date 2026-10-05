import { handler, ok, readJson } from "@/lib/api";
import { logActivity } from "@/lib/activity-log";
import { requireApiAdmin } from "@/lib/dal";
import { storeStatusSchema } from "@/lib/schemas";
import { getStoreStatus, saveStoreStatus } from "@/lib/settings";

export const GET = handler(async () => {
  await requireApiAdmin();
  return ok({ status: await getStoreStatus() });
});

// باز/بسته‌کردن فروشگاه (و ویرایش پیام تعطیلی) توسط ادمین
export const PUT = handler(async (request) => {
  const admin = await requireApiAdmin();
  const data = storeStatusSchema.parse(await readJson(request));
  await saveStoreStatus(data);
  const status = await getStoreStatus(); // پیام خالی → پیام پیش‌فرض
  await logActivity(admin, {
    action: "STATUS",
    entity: "STORE_STATUS",
    summary: status.open ? "فروشگاه باز شد" : "فروشگاه بسته شد",
  });
  return ok({ status });
});
