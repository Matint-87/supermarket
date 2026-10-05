import { handler, ok } from "@/lib/api";
import { getCurrentUser, toPublicUser } from "@/lib/dal";
import { destroySession, readSessionCookie } from "@/lib/session";

/** کاربر جاری. برای مهمان‌ها 200 با user: null برمی‌گردونه (تا کنسول مرورگر پر از 401 نشه) */
export const GET = handler(async () => {
  const user = await getCurrentUser();
  if (!user) {
    // کوکی کهنه/باطل‌شده رو پاک کن
    if (await readSessionCookie()) await destroySession();
    return ok({ user: null });
  }
  return ok({ user: toPublicUser(user) });
});
