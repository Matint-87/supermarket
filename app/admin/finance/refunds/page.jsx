import TransactionsAdmin from "@/components/admin/TransactionsAdmin";
import { fetchTransactionsPage, parseTransactionFilters } from "@/lib/admin-queries";
import { paramString } from "@/lib/admin-dal";
import { toEnglishDigits } from "@/lib/phone";

export const metadata = { title: "برگشت وجه | پنل مدیریت" };

export default async function AdminRefundsPage({ searchParams }) {
  const sp = await searchParams;
  const filters = parseTransactionFilters(sp, "REFUND");
  const initial = await fetchTransactionsPage(filters);
  // لینک «ثبت پرداخت/برگشت» از صفحه‌ی سفارش: ?order=کد۸رقمی
  const order = toEnglishDigits(paramString(sp?.order, 20));
  const defaultOrderCode = /^\d{8}$/.test(order) ? order : "";

  return (
    <TransactionsAdmin
      key={JSON.stringify(filters) + defaultOrderCode}
      mode="REFUND"
      filters={filters}
      initial={initial}
      defaultOrderCode={defaultOrderCode}
    />
  );
}
