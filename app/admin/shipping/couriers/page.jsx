import CouriersAdmin from "@/components/admin/CouriersAdmin";
import { fetchCouriersPage, parseCourierFilters } from "@/lib/admin-queries";

export const metadata = { title: "پیک‌ها | پنل مدیریت" };

export default async function AdminCouriersPage({ searchParams }) {
  const filters = parseCourierFilters(await searchParams);
  const initial = await fetchCouriersPage(filters);
  return <CouriersAdmin key={JSON.stringify(filters)} filters={filters} initial={initial} />;
}
