import { ApiError, handler, ok, readJson } from "@/lib/api";
import { requireApiUser, toPublicAddress } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { addressSchema, uuidSchema } from "@/lib/schemas";

/** آدرسی که مال همین کاربره؛ وگرنه 404 (وجود آدرس‌های دیگران رو هم لو نمی‌ده) */
async function findOwned(ctx, userId) {
  const { id } = await ctx.params;
  if (!uuidSchema.safeParse(id).success) throw new ApiError(404, "آدرس پیدا نشد");
  const address = await prisma.address.findFirst({ where: { id, userId } });
  if (!address) throw new ApiError(404, "آدرس پیدا نشد");
  return address;
}

export const PUT = handler(async (request, ctx) => {
  const user = await requireApiUser();
  const existing = await findOwned(ctx, user.id);
  const data = addressSchema.parse(await readJson(request));

  const updated = await prisma.$transaction(async (tx) => {
    // آدرس پیش‌فرض رو نمی‌شه «بی‌پیش‌فرض» کرد؛ باید آدرس دیگه‌ای پیش‌فرض بشه
    const makeDefault = data.isDefault || existing.isDefault;
    if (makeDefault && !existing.isDefault) {
      await tx.address.updateMany({
        where: { userId: user.id, isDefault: true },
        data: { isDefault: false },
      });
    }
    return tx.address.update({ where: { id: existing.id }, data: { ...data, isDefault: makeDefault } });
  });

  return ok({ address: toPublicAddress(updated) });
});

export const DELETE = handler(async (request, ctx) => {
  const user = await requireApiUser();
  const existing = await findOwned(ctx, user.id);

  await prisma.$transaction(async (tx) => {
    await tx.address.delete({ where: { id: existing.id } });
    if (existing.isDefault) {
      // جدیدترین آدرس باقی‌مانده پیش‌فرض می‌شه
      const next = await tx.address.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
      });
      if (next) await tx.address.update({ where: { id: next.id }, data: { isDefault: true } });
    }
  });

  return ok();
});
