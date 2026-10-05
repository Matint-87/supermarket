import { handler, ok } from "@/lib/api";
import { requireApiUser } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { toPublicWalletTx } from "@/lib/wallet";

/** کیف پول کاربر جاری: موجودی + ۵۰ تراکنش آخر */
export const GET = handler(async () => {
  const user = await requireApiUser();
  const rows = await prisma.walletTransaction.findMany({
    where: { userId: user.id },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 50,
  });
  return ok({ balance: user.walletBalance, transactions: rows.map(toPublicWalletTx) });
});
