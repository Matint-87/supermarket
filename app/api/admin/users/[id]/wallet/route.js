import { logActivity } from "@/lib/activity-log";
import { ApiError, handler, ok, readJson } from "@/lib/api";
import { requireApiAdmin } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { formatToman } from "@/lib/format";
import { adminWalletAdjustSchema, uuidSchema } from "@/lib/schemas";
import { creditWallet, debitWallet, toPublicWalletTx } from "@/lib/wallet";

async function readId(ctx) {
  const { id } = await ctx.params;
  if (!uuidSchema.safeParse(id).success) throw new ApiError(400, "شناسه نامعتبر است");
  return id;
}

/** فقط ادمین: موجودی و ۲۰ تراکنش آخر کیف پول یک کاربر */
export const GET = handler(async (_request, ctx) => {
  await requireApiAdmin();
  const id = await readId(ctx);
  const user = await prisma.user.findUnique({ where: { id }, select: { walletBalance: true } });
  if (!user) throw new ApiError(404, "کاربر پیدا نشد");
  const rows = await prisma.walletTransaction.findMany({
    where: { userId: id },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 20,
  });
  return ok({ balance: user.walletBalance, transactions: rows.map(toPublicWalletTx) });
});

/** فقط ادمین: شارژ یا کسر دستی کیف پول (دلیل اجباریه و توی لاگ فعالیت‌ها ثبت می‌شه) */
export const POST = handler(async (request, ctx) => {
  const admin = await requireApiAdmin();
  const id = await readId(ctx);
  const { type, amount, note } = adminWalletAdjustSchema.parse(await readJson(request));

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) throw new ApiError(404, "کاربر پیدا نشد");
  const adminName = [admin.firstName, admin.lastName].filter(Boolean).join(" ") || admin.phone;

  const balance = await prisma.$transaction((tx) =>
    (type === "CREDIT" ? creditWallet : debitWallet)(tx, {
      userId: id,
      amount,
      reason: "ADMIN_ADJUST",
      note,
      adminName,
    }),
  );

  await logActivity(admin, {
    action: "UPDATE",
    entity: "WALLET",
    entityId: id,
    summary: `${type === "CREDIT" ? "شارژ" : "کسر"} ${formatToman(amount)} ${type === "CREDIT" ? "به" : "از"} کیف پول ${
      [target.firstName, target.lastName].filter(Boolean).join(" ") || target.phone
    } (${note})`,
  });
  return ok({ balance }, { status: 201 });
});
