import { notFound } from "next/navigation";
import BackButton from "@/components/BackButton";
import InvoiceDocument from "@/components/orders/InvoiceDocument";
import PrintButton from "@/components/profile/PrintButton";
import { requireUser, toPublicOrder } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { moneyByOrder, publicPayment } from "@/lib/finance";

export const metadata = { title: "فاکتور سفارش", robots: { index: false, follow: false } };

export default async function InvoicePage({ params }) {
  const { code } = await params;
  if (!/^\d{8}$/.test(code)) notFound();

  const user = await requireUser({ next: `/profile/orders/${code}/invoice` });

  // فقط صاحب سفارش می‌تونه فاکتور رو ببینه
  const row = await prisma.order.findFirst({
    where: { code, userId: user.id },
    include: { items: true },
  });
  if (!row) notFound();
  const order = toPublicOrder(row);
  const payment = publicPayment(row, (await moneyByOrder(prisma, [row.id])).get(row.id));

  const buyer = {
    name: [user.firstName, user.lastName].filter(Boolean).join(" ") || order.address.recipientName,
    phone: user.phone,
    nationalCode: user.nationalCode,
  };

  return (
    <div className="min-h-dvh bg-slate-100 px-3 py-6 font-[Number] text-slate-900 print:bg-white print:p-0">
      {/* نوار ابزار — موقع چاپ دیده نمی‌شه */}
      <div className="mx-auto mb-4 flex max-w-[210mm] items-center justify-between gap-3 print:hidden">
        <BackButton withLabel fallback="/profile?tab=orders" hideOn={[]} />
        <PrintButton />
      </div>

      <InvoiceDocument order={order} buyer={buyer} payment={payment} />
    </div>
  );
}
