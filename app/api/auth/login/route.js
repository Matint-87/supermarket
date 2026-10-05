import { getClientIp, handler, ok, readJson } from "@/lib/api";
import { loginWithPassword } from "@/lib/auth-service";
import { toPublicUser } from "@/lib/dal";
import { loginSchema } from "@/lib/schemas";

/** ورود با شماره و رمز (برای دفعه‌های بعد) */
export const POST = handler(async (request) => {
  const { phone, password } = loginSchema.parse(await readJson(request));
  const user = await loginWithPassword({ phone, password, ip: await getClientIp() });
  return ok({ user: toPublicUser(user) });
});
