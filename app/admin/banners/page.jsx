import BannersAdmin from "@/components/admin/BannersAdmin";
import { getAllBanners } from "@/lib/banners";

export const metadata = { title: "بنرهای صفحه‌ی اصلی | پنل مدیریت" };

export default async function AdminBannersPage() {
  const banners = await getAllBanners();
  return <BannersAdmin initial={banners} />;
}
