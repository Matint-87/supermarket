import CategoriesAdmin from "@/components/admin/CategoriesAdmin";
import { fetchCategoriesPage } from "@/lib/admin-queries";

export const metadata = { title: "دسته‌بندی‌ها | پنل مدیریت" };

export default async function AdminCategoriesPage() {
  // فقط ۱۰ دسته‌ی اول اینجا رندر می‌شه؛ بقیه با اسکرول از /api/admin/categories لود می‌شن
  const initial = await fetchCategoriesPage();
  return <CategoriesAdmin initial={initial} />;
}
