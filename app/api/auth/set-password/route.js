import { ApiError, getClientIp, handler, ok, readJson } from "@/lib/api";
import { TICKET_EXPIRED, completePasswordSetup } from "@/lib/auth-service";
import { toPublicUser } from "@/lib/dal";
import { rateLimit } from "@/lib/rate-limit";
import { setPasswordSchema } from "@/lib/schemas";
import { readTicket } from "@/lib/session";

/** تعیین رمز بعد از تأیید OTP (کاربر جدید یا فراموشی رمز) و ورود به حساب */
export const POST = handler(async (request) => {
  const { password } = setPasswordSchema.parse(await readJson(request));
  await rateLimit(`setpw:ip:${await getClientIp()}`, 20, 600);

  const ticket = await readTicket();
  if (!ticket) throw new ApiError(401, TICKET_EXPIRED, { code: "TICKET_EXPIRED" });

  const user = await completePasswordSetup({ ticket, password });
  return ok({ user: toPublicUser(user) });
});
