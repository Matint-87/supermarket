import ActivityAdmin from "@/components/admin/ActivityAdmin";
import { fetchActivityPage, parseActivityFilters } from "@/lib/admin-queries";

export const metadata = { title: "لاگ فعالیت‌ها | پنل مدیریت" };

export default async function AdminActivityPage({ searchParams }) {
  const filters = parseActivityFilters(await searchParams);
  const initial = await fetchActivityPage(filters);
  return <ActivityAdmin key={JSON.stringify(filters)} filters={filters} initial={initial} />;
}
