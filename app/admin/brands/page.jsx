import BrandsAdmin from "@/components/admin/BrandsAdmin";
import { fetchBrandsPage } from "@/lib/admin-queries";

export const metadata = { title: "برندها | پنل مدیریت" };

export default async function AdminBrandsPage() {
  // فقط ۱۰ برند اول اینجا رندر می‌شه؛ بقیه با اسکرول از /api/admin/brands لود می‌شن
  const initial = await fetchBrandsPage();
  return <BrandsAdmin initial={initial} />;
}
