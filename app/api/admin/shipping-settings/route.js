import { handler, ok, readJson } from "@/lib/api";
import { logActivity } from "@/lib/activity-log";
import { requireApiAdmin } from "@/lib/dal";
import { shippingSettingsSchema } from "@/lib/schemas";
import { getShippingSettings, saveShippingSettings } from "@/lib/settings";

export const GET = handler(async () => {
  await requireApiAdmin();
  return ok({ settings: await getShippingSettings() });
});

export const PUT = handler(async (request) => {
  const admin = await requireApiAdmin();
  const data = shippingSettingsSchema.parse(await readJson(request));
  await saveShippingSettings(data);
  await logActivity(admin, { action: "UPDATE", entity: "SHIPPING_SETTINGS", summary: "تنظیمات ارسال ویرایش شد" });
  return ok({ settings: data });
});
