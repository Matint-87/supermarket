import { handler, ok, readJson } from "@/lib/api";
import { destroySession } from "@/lib/session";

export const POST = handler(async (request) => {
  await readJson(request); // فقط JSON قبول می‌شه (جلوگیری از logout از طریق فرم سایت‌های دیگه)
  await destroySession();
  return ok();
});
