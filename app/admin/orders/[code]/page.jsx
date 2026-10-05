import { notFound } from "next/navigation";
import OrderDetail from "@/components/admin/OrderDetail";
import { fullName } from "@/lib/admin-dal";
import { requireAdmin, toPublicOrder } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { orderMoney } from "@/lib/finance";
import { toPublicCourier } from "@/lib/dal";

export const metadata = { title: "جزئیات سفارش | پنل مدیریت" };

export default async function AdminOrderDetailPage({ params }) {
  await requireAdmin();
  const { code } = await params;
  if (!/^\d{8}$/.test(code)) notFound();

  const order = await prisma.order.findUnique({ where: { code }, include: { items: true, user: true } });
  if (!order) notFound();

  // پیک‌های فعال (به‌علاوه‌ی پیک فعلی سفارش، حتی اگه بعداً غیرفعال شده باشه) و وضعیت مالی سفارش
  const [couriers, money, txRows] = await Promise.all([
    prisma.courier.findMany({
      where: { OR: [{ isActive: true }, ...(order.courierId ? [{ id: order.courierId }] : [])] },
      orderBy: { name: "asc" },
    }),
    orderMoney(prisma, order.id),
    prisma.transaction.findMany({ where: { orderId: order.id }, orderBy: { createdAt: "desc" }, take: 20 }),
  ]);

  return (
    <div>
      <OrderDetail
        order={toPublicOrder(order)}
        buyer={{ id: order.user.id, name: fullName(order.user) || order.recipientName, phone: order.user.phone }}
        couriers={couriers.map(toPublicCourier)}
        money={money}
        buyerWallet={order.user.walletBalance}
        transactions={txRows.map((t) => ({
          id: t.id,
          type: t.type,
          status: t.status,
          method: t.method,
          amount: t.amount,
          reference: t.reference,
          createdAt: t.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
