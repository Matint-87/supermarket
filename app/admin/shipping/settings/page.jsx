import ShippingSettingsForm from "@/components/admin/ShippingSettingsForm";
import { getShippingSettings } from "@/lib/settings";

export const metadata = { title: "تنظیمات ارسال | پنل مدیریت" };

export default async function AdminShippingSettingsPage() {
  const settings = await getShippingSettings();
  return <ShippingSettingsForm initial={settings} />;
}
