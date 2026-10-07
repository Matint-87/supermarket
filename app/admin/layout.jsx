import AdminShell from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/dal";

export const metadata = { title: "پنل مدیریت", robots: { index: false, follow: false } };

// دسترسی همه‌ی صفحه‌های /admin اینجا (و دوباره در هر API) از دیتابیس چک می‌شه
export default async function AdminLayout({ children }) {
  const admin = await requireAdmin();
  return (
    <AdminShell admin={{ firstName: admin.firstName, lastName: admin.lastName }}>{children}</AdminShell>
  );
}
