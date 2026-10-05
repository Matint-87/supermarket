import { ApiError, handler, ok, readJson } from "@/lib/api";
import { MAX_ADDRESSES } from "@/lib/auth-constants";
import { isOnboarded, requireApiUser, toPublicAddress } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { addressSchema } from "@/lib/schemas";
import { createSession } from "@/lib/session";

export const GET = handler(async () => {
  const user = await requireApiUser();
  const addresses = await prisma.address.findMany({
    where: { userId: user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });
  return ok({ addresses: addresses.map(toPublicAddress) });
});

export const POST = handler(async (request) => {
  const user = await requireApiUser();
  const data = addressSchema.parse(await readJson(request));

  const created = await prisma.$transaction(async (tx) => {
    const count = await tx.address.count({ where: { userId: user.id } });
    if (count >= MAX_ADDRESSES) {
      throw new ApiError(400, `حداکثر ${MAX_ADDRESSES} آدرس می‌توانید ثبت کنید`);
    }
    // اولین آدرس همیشه پیش‌فرضه
    const makeDefault = data.isDefault || count === 0;
    if (makeDefault) {
      await tx.address.updateMany({
        where: { userId: user.id, isDefault: true },
        data: { isDefault: false },
      });
    }
    return tx.address.create({ data: { ...data, isDefault: makeDefault, userId: user.id } });
  });

  // اولین آدرس ممکنه «کامل بودن حساب» رو تغییر بده؛ سشن رو رفرش کن تا proxy.js هم باخبر بشه
  await createSession(user, { profileCompleted: await isOnboarded(user) });

  return ok({ address: toPublicAddress(created) }, { status: 201 });
});
