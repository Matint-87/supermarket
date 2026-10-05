import ZonesAdmin from "@/components/admin/ZonesAdmin";
import { fetchZonesPage } from "@/lib/admin-queries";

export const metadata = { title: "محدوده‌های ارسال | پنل مدیریت" };

export default async function AdminZonesPage() {
  const initial = await fetchZonesPage();
  return <ZonesAdmin initial={initial} />;
}
