import { notFound } from "next/navigation";
import UserDetail from "@/components/admin/UserDetail";
import { toAdminUser } from "@/lib/admin-dal";
import { fetchUserOrdersPaged } from "@/lib/admin-queries";
import { requireAdmin, toPublicAddress } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { uuidSchema } from "@/lib/schemas";
import { toPublicWalletTx } from "@/lib/wallet";

export const metadata = { title: "جزئیات کاربر | پنل مدیریت" };

export default async function AdminUserDetailPage({ params }) {
  const admin = await requireAdmin();
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) notFound();

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      _count: { select: { orders: true } },
      // هر کاربر حداکثر ۱۰ آدرس داره، پس همه‌شون یک‌جا لود می‌شن
      addresses: { orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] },
    },
  });
  if (!user) notFound();

  // صفحه‌ی اول سفارش‌ها (۱۰ تا)؛ جست‌وجو، فیلتر روز و صفحه‌های بعد از /api/admin/users/[id]/orders
  const initialOrders = await fetchUserOrdersPaged(id, {});
  const walletTx = await prisma.walletTransaction.findMany({
    where: { userId: id },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 20,
  });

  return (
    <div>
      <UserDetail
        user={toAdminUser(user)}
        addresses={user.addresses.map(toPublicAddress)}
        initialOrders={initialOrders}
        isSelf={user.id === admin.id}
        wallet={{ balance: user.walletBalance, transactions: walletTx.map(toPublicWalletTx) }}
      />
    </div>
  );
}
