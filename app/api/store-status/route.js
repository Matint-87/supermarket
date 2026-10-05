import { handler, ok } from "@/lib/api";
import { getStoreStatus } from "@/lib/settings";

// عمومی: کلاینت از اینجا می‌فهمه فروشگاه باز است یا نه (همیشه تازه، بدون کش)
export const dynamic = "force-dynamic";

export const GET = handler(async () => {
  const status = await getStoreStatus();
  return ok({ open: status.open, message: status.open ? "" : status.closedMessage }, { headers: { "Cache-Control": "no-store" } });
});
