"use client";
// کمک‌تابع‌های Web Push سمت مرورگر: ثبت Service Worker، گرفتن اجازه، subscribe/unsubscribe.
import { api } from "@/lib/api-client";

export function pushSupported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

/** آیفون فقط وقتی سایت به «صفحه‌ی اصلی» اضافه شده باشد پوش می‌دهد */
export function needsInstallForPush() {
  if (typeof window === "undefined") return false;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone = window.matchMedia?.("(display-mode: standalone)").matches || navigator.standalone;
  return ios && !standalone;
}

export async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  } catch {
    return null;
  }
}

function urlBase64ToUint8Array(base64) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function subscribeAndSave() {
  const { enabled, publicKey } = await api("GET", "/api/push/subscribe");
  if (!enabled || !publicKey) return false;
  await registerServiceWorker();
  const reg = await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) }));
  await api("POST", "/api/push/subscribe", sub.toJSON());
  return true;
}

/** با کلیک کاربر صدا بزن: اجازه می‌گیرد و اشتراک را ثبت می‌کند. خروجی: granted | denied | default | unavailable */
export async function enablePush() {
  if (!pushSupported()) return "unavailable";
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission;
  try {
    return (await subscribeAndSave()) ? "granted" : "unavailable";
  } catch {
    return "unavailable";
  }
}

/** اگه قبلاً اجازه داده شده، بی‌صدا اشتراک را با سرور هماهنگ نگه می‌دارد */
export async function syncPush() {
  if (!pushSupported() || Notification.permission !== "granted") return;
  try {
    await subscribeAndSave();
  } catch {}
}

/** موقع خروج از حساب: اشتراک این دستگاه را از سرور و مرورگر پاک می‌کند */
export async function disablePushOnThisDevice() {
  if (!pushSupported()) return;
  try {
    const reg = await navigator.serviceWorker.getRegistration("/");
    const sub = await reg?.pushManager.getSubscription();
    if (!sub) return;
    await api("DELETE", "/api/push/subscribe", { endpoint: sub.endpoint }).catch(() => {});
    await sub.unsubscribe();
  } catch {}
}
