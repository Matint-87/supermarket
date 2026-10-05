import UsersAdmin from "@/components/admin/UsersAdmin";
import { fetchUsersPage, parseUserFilters } from "@/lib/admin-queries";
import { requireAdmin } from "@/lib/dal";

export const metadata = { title: "کاربران | پنل مدیریت" };

export default async function AdminUsersPage({ searchParams }) {
  const admin = await requireAdmin();
  const filters = parseUserFilters(await searchParams);
  // فقط ۱۰ کاربر اول اینجا رندر می‌شه؛ بقیه با اسکرول از /api/admin/users لود می‌شن
  const initial = await fetchUsersPage(filters);

  return (
    <UsersAdmin
      // با عوض‌شدن فیلترها لیست از صفر ساخته می‌شه (پاسخ‌های کهنه وارد لیست جدید نمی‌شن)
      key={JSON.stringify(filters)}
      filters={filters}
      initial={initial}
      currentAdminId={admin.id}
    />
  );
}
