import BackButton from "@/components/BackButton";
import { notFound } from "next/navigation";
import InvoiceDocument from "@/components/orders/InvoiceDocument";
import PrintButton from "@/components/profile/PrintButton";
import { fullName } from "@/lib/admin-dal";
import { requireAdmin, toPublicOrder } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { moneyByOrder, publicPayment } from "@/lib/finance";
import { toFaDigits } from "@/lib/phone";

export const metadata = { title: "چاپ فاکتور | پنل مدیریت" };

const MAX_INVOICES = 50;

/**
 * چاپ فاکتور سفارش‌ها (مدیر): /admin/print/invoices?codes=12345678,87654321
 * با یک کد = فاکتور تکی؛ با چند کد = همه پشت سر هم و هر فاکتور در یک صفحه‌ی جدا.
 * (این مسیر زیر /admin هست تا چک ادمین و عبور از proxy همون مسیرهای پنل باشه؛ AdminShell برای این مسیر منو نمایش نمی‌ده.)
 */
export default async function AdminPrintInvoicesPage({ searchParams }) {
  await requireAdmin();
  const raw = (await searchParams)?.codes;
  const codes = [
    ...new Set(
      String(Array.isArray(raw) ? raw[0] : (raw ?? ""))
        .split(",")
        .map((c) => c.trim())
        .filter((c) => /^\d{8}$/.test(c)),
    ),
  ].slice(0, MAX_INVOICES);
  if (codes.length === 0) notFound();

  const rows = await prisma.order.findMany({
    where: { code: { in: codes } },
    include: { items: true, user: true },
  });
  if (rows.length === 0) notFound();
  // ترتیب چاپ = ترتیب کدهای ورودی
  rows.sort((x, y) => codes.indexOf(x.code) - codes.indexOf(y.code));

  const money = await moneyByOrder(prisma, rows.map((r) => r.id));

  return (
    <div className="min-h-screen bg-slate-100 px-3 py-6 font-[Number] text-slate-900 print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex max-w-[210mm] items-center justify-between gap-3 print:hidden">
        <BackButton fallback="/admin/orders" hideOn={[]} />
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">{toFaDigits(rows.length)} فاکتور</span>
          <PrintButton label={rows.length > 1 ? "چاپ همه‌ی فاکتورها" : "چاپ فاکتور"} />
        </div>
      </div>

      <div className="space-y-6 print:space-y-0">
        {rows.map((row, i) => {
          const order = toPublicOrder(row);
          return (
            <InvoiceDocument
              key={row.id}
              order={order}
              payment={publicPayment(row, money.get(row.id))}
              buyer={{
                name: fullName(row.user) || order.address.recipientName,
                phone: row.user.phone,
                nationalCode: row.user.nationalCode,
              }}
              breakAfter={i < rows.length - 1}
            />
          );
        })}
      </div>
    </div>
  );
}
