import AddressesAdmin from "@/components/admin/AddressesAdmin";
import { fetchAddressesPage, parseAddressFilters } from "@/lib/admin-queries";

export const metadata = { title: "آدرس‌ها | پنل مدیریت" };

export default async function AdminAddressesPage({ searchParams }) {
  const filters = parseAddressFilters(await searchParams);
  const initial = await fetchAddressesPage(filters);
  return <AddressesAdmin key={JSON.stringify(filters)} filters={filters} initial={initial} />;
}
