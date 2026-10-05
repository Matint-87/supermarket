import { handler, ok, readJson } from "@/lib/api";
import { requireApiUser } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/session";

/**
 * خروج از سایر دستگاه‌ها: نسخه‌ی توکن زیاد می‌شه و همه‌ی JWTهای قبلی باطل می‌شن؛
 * دستگاه فعلی با توکن جدید وارد می‌مونه.
 */
export const POST = handler(async (request) => {
  await readJson(request);
  const user = await requireApiUser();
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { tokenVersion: { increment: 1 } },
  });
  await createSession(updated);
  return ok();
});
