// کیف پول کاربر. همه‌ی تغییرهای موجودی فقط از همین‌جا انجام می‌شه و همیشه باید داخل یک prisma.$transaction
// صدا زده بشه (پارامتر tx) تا موجودی و دفتر کیف پول (wallet_transactions) با هم ثبت بشن یا هیچ‌کدوم.
import "server-only";
import { ApiError } from "@/lib/api";
import { formatToman } from "@/lib/format";

/** افزایش موجودی؛ موجودیِ جدید رو برمی‌گردونه */
export async function creditWallet(tx, { userId, amount, reason, orderCode = null, note = null, adminName = null }) {
  if (!Number.isInteger(amount) || amount <= 0) throw new Error("مبلغ کیف پول باید عدد صحیح مثبت باشد");
  const user = await tx.user.update({
    where: { id: userId },
    data: { walletBalance: { increment: amount } },
    select: { walletBalance: true },
  });
  await tx.walletTransaction.create({
    data: { userId, type: "CREDIT", reason, amount, balanceAfter: user.walletBalance, orderCode, note, adminName },
  });
  return user.walletBalance;
}

/** کاهش موجودی؛ اگه موجودی کافی نباشه ApiError(409) پرتاب می‌کنه (هیچ‌وقت منفی نمی‌شه) */
export async function debitWallet(tx, { userId, amount, reason, orderCode = null, note = null, adminName = null }) {
  if (!Number.isInteger(amount) || amount <= 0) throw new Error("مبلغ کیف پول باید عدد صحیح مثبت باشد");
  const res = await tx.user.updateMany({
    where: { id: userId, walletBalance: { gte: amount } },
    data: { walletBalance: { decrement: amount } },
  });
  if (res.count === 0) {
    const u = await tx.user.findUnique({ where: { id: userId }, select: { walletBalance: true } });
    throw new ApiError(409, `موجودی کیف پول کافی نیست (موجودی: ${formatToman(u?.walletBalance ?? 0)})`);
  }
  const user = await tx.user.findUnique({ where: { id: userId }, select: { walletBalance: true } });
  await tx.walletTransaction.create({
    data: { userId, type: "DEBIT", reason, amount, balanceAfter: user.walletBalance, orderCode, note, adminName },
  });
  return user.walletBalance;
}

export function toPublicWalletTx(t) {
  return {
    id: t.id,
    type: t.type,
    reason: t.reason,
    amount: t.amount,
    balanceAfter: t.balanceAfter,
    orderCode: t.orderCode,
    note: t.note,
    createdAt: t.createdAt.toISOString(),
  };
}
