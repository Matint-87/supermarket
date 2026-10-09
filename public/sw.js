// Service Worker سوپرمارکت: دریافت Web Push و نمایش اعلان سیستمی (موبایل و دسکتاپ، حتی وقتی سایت بسته‌ست)
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

const ADMIN_TYPES = ["ORDER_NEW", "ORDER_CANCELED", "LOW_STOCK", "OUT_OF_STOCK"];
// سافاری هر پوش رو باید اعلان کنه (وگرنه اشتراک رو لغو می‌کنه)؛ بقیه‌ی مرورگرها وقتی تب باز و روبروی کاربره، اعلان تکراری لازم ندارن
const IS_SAFARI = /^((?!chrome|android|crios|fxios).)*safari/i.test(self.navigator.userAgent);

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }

  event.waitUntil(
    (async () => {
      if (!IS_SAFARI) {
        const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
        // تب باز و دیده‌شونده → خود صفحه با SSE (toast + صدا) اعلام می‌کنه
        if (windows.some((c) => c.visibilityState === "visible" && c.focused)) return;
      }
      const important = ADMIN_TYPES.includes(data.type);
      await self.registration.showNotification(data.title || "سوپرمارکت رحیمی", {
        body: data.body || "",
        icon: "/icon.png",
        badge: "/icon.png",
        tag: data.tag || undefined,
        renotify: Boolean(data.tag),
        dir: "rtl",
        lang: "fa",
        vibrate: important ? [250, 120, 250, 120, 250] : [200, 100, 200],
        silent: false,
        requireInteraction: important,
        data: { url: data.url || "/" },
      });
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of windows) {
        if (new URL(client.url).origin === self.location.origin && "focus" in client) {
          await client.focus();
          if ("navigate" in client) await client.navigate(target).catch(() => {});
          return;
        }
      }
      await self.clients.openWindow(target);
    })(),
  );
});
