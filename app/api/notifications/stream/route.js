import { getCurrentUser } from "@/lib/dal";
import { subscribe } from "@/lib/realtime";

// اتصال SSE بلندمدت: هیچ‌وقت کش نشه، فقط توی Node (نه Edge) اجرا بشه
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * جریان زنده‌ی اعلان‌های کاربر جاری (Server-Sent Events).
 * مرورگر با EventSource وصل می‌شه و هر اعلان جدید رو فوراً به‌صورت event: notification می‌گیره.
 * اگه اتصال قطع بشه EventSource خودش دوباره وصل می‌شه (کلاینت بعد از اتصال دوباره، اعلان‌های از‌دست‌رفته رو از /api/notifications می‌خونه).
 */
export async function GET(request) {
  const user = await getCurrentUser();
  if (!user) return new Response("unauthorized", { status: 401 });

  const encoder = new TextEncoder();
  let cleanup = () => {};

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      const write = (chunk) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          cleanup();
        }
      };

      write("retry: 5000\n\n");
      const unsubscribe = subscribe(user.id, (n) => write(`event: notification\ndata: ${JSON.stringify(n)}\n\n`));
      // ضربان: جلوی بستن اتصال بیکار توسط nginx/پروکسی/موبایل رو می‌گیره
      const ping = setInterval(() => write(": ping\n\n"), 25_000);

      cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(ping);
        unsubscribe();
        try {
          controller.close();
        } catch {}
      };
      request.signal.addEventListener("abort", cleanup);
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // nginx بافر نکنه
    },
  });
}
