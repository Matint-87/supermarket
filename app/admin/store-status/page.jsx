import StoreStatusAdmin from "@/components/admin/StoreStatusAdmin";
import { getStoreStatus } from "@/lib/settings";

export const metadata = { title: "وضعیت فروشگاه | پنل مدیریت" };

export default async function AdminStoreStatusPage() {
  const status = await getStoreStatus();
  return <StoreStatusAdmin initial={status} />;
}
