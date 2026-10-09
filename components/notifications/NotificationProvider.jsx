"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { useAuth } from "@/components/auth/AuthProvider";
import { api } from "@/lib/api-client";
import { ADMIN_NOTIFICATION_TYPES } from "@/lib/notification-constants";
import { buildSounds, vibrate } from "@/lib/notification-sound";
import { enablePush, pushSupported, registerServiceWorker, syncPush } from "@/lib/push-client";

const NotificationContext = createContext({
  items: [],
  unread: 0,
  hasMore: false,
  loadingMore: false,
  loadMore: async () => {},
  soundOn: true,
  setSoundOn: () => {},
  permission: "unavailable",
  enable: async () => {},
  markRead: async () => {},
  markAllRead: async () => {},
  remove: async (ids) => {},
  removeAll: async () => {},
  testSound: () => {},
  open: (n) => {},
});

const SOUND_KEY = "shop:notif-sound";

/** ادغام دو لیست اعلان بدون تکرار؛ جدیدترین اول (برای وقتی صفحه‌های قبلی لود شده‌ان و لیست تازه می‌رسه) */
function mergeById(...lists) {
  const map = new Map();
  for (const list of lists) for (const n of list) if (!map.has(n.id)) map.set(n.id, n);
  return [...map.values()].sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
}

/**
 * اعلان‌های لحظه‌ای: لیست از API، اتصال زنده با SSE، صدا، toast، badge روی آیکن برنامه و ثبت Web Push.
 * باید داخل AuthProvider باشد.
 */
export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [nextCursor, setNextCursor] = useState(null); // null = صفحه‌ی بعدی نداریم
  const [loadingMore, setLoadingMore] = useState(false);
  const cursorLoaded = useRef(false); // آیا اولین صفحه لود شده؟ (بعدش cursor رو فقط loadMore عوض می‌کنه)
  const loadingMoreRef = useRef(false);
  const [soundOn, setSoundOnState] = useState(true);
  const [permission, setPermission] = useState("unavailable");
  // صدا با Web Audio API: روی موبایل (iOS/Android) برخلاف <audio> بعد از یک بار «باز شدن قفل» قابل‌اعتماد پخش می‌شه
  const audio = useRef({ ctx: null, buffers: {}, unlocked: false });
  const seen = useRef(new Set());
  const pathRef = useRef(pathname);
  pathRef.current = pathname;
  const soundRef = useRef(true);
  const itemsRef = useRef([]);
  itemsRef.current = items;

  // تنظیم صدا + اجازه‌ی فعلی مرورگر
  useEffect(() => {
    try {
      const off = localStorage.getItem(SOUND_KEY) === "off";
      setSoundOnState(!off);
      soundRef.current = !off;
    } catch {}
    setPermission(pushSupported() ? Notification.permission : "unavailable");
  }, []);

  const setSoundOn = useCallback((on) => {
    setSoundOnState(on);
    soundRef.current = on;
    try {
      localStorage.setItem(SOUND_KEY, on ? "on" : "off");
    } catch {}
  }, []);

  // مرورگرها قبل از اولین تعامل کاربر اجازه‌ی پخش صدا نمی‌دهند. با اولین لمس/کلیک «قفل صدا» باز می‌شه.
  // نکته‌ی مهم: روی موبایل رویداد pointerdown «تعامل معتبر» حساب نمی‌شه؛ فقط pointerup/touchend/click/keydown.
  // (نسخه‌ی قبلی با pointerdown قفل رو باز می‌کرد، پخش رد می‌شد، و صدا برای همیشه mute می‌موند.)
  useEffect(() => {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    let ctx;
    try {
      ctx = new AC();
    } catch {
      return;
    }
    audio.current.ctx = ctx;
    audio.current.unlocked = false;

    // صداها از همین‌جا ساخته می‌شن؛ هیچ فایلی دانلود نمی‌شه
    try {
      audio.current.buffers = buildSounds(ctx);
    } catch {}

    const EVENTS = ["pointerup", "touchend", "click", "keydown"];
    const detach = () => EVENTS.forEach((e) => window.removeEventListener(e, unlock, true));
    function unlock() {
      // resume باید همین‌جا و هم‌زمان با لمس کاربر صدا زده بشه
      ctx
        .resume()
        .then(() => {
          if (ctx.state !== "running") return; // هنوز قفله؛ لمس بعدی دوباره تلاش می‌کنه
          try {
            const src = ctx.createBufferSource(); // یک نمونه‌ی بی‌صدا؛ iOS رو کامل باز می‌کنه
            src.buffer = ctx.createBuffer(1, 1, 22050);
            src.connect(ctx.destination);
            src.start(0);
          } catch {}
          audio.current.unlocked = true;
          detach();
        })
        .catch(() => {});
    }
    EVENTS.forEach((e) => window.addEventListener(e, unlock, { capture: true, passive: true }));

    // وقتی برنامه از پس‌زمینه برمی‌گرده، موبایل ممکنه صدا رو suspend کرده باشه
    const onVisible = () => {
      if (document.visibilityState === "visible" && ctx.state === "suspended" && audio.current.unlocked) ctx.resume().catch(() => {});
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      detach();
      document.removeEventListener("visibilitychange", onVisible);
      ctx.close().catch(() => {});
    };
  }, []);

  const play = useCallback((type) => {
    if (!soundRef.current) return;
    const { ctx, buffers } = audio.current;
    const buffer = type === "ORDER_NEW" ? buffers.order : buffers.notify;
    try {
      if (ctx && buffer) {
        if (ctx.state === "suspended") ctx.resume().catch(() => {});
        if (ctx.state === "running") {
          const src = ctx.createBufferSource();
          src.buffer = buffer;
          src.connect(ctx.destination);
          src.start(0);
          return;
        }
      }
      // هنوز قفل یا بدون Web Audio: حداقل گوشی بلرزه (روی اندروید)
      vibrate(type === "ORDER_NEW");
    } catch {}
  }, []);

  const load = useCallback(async () => {
    try {
      const data = await api("GET", "/api/notifications");
      data.notifications.forEach((n) => seen.current.add(n.id));
      // صفحه‌هایی که کاربر قبلاً پایین‌تر لود کرده نگه داشته می‌شن (مثلاً موقع برگشت به تب)
      setItems((prev) => mergeById(data.notifications, prev));
      setUnread(data.unread);
      if (!cursorLoaded.current) {
        cursorLoaded.current = true;
        setNextCursor(data.nextCursor ?? null);
      }
    } catch {}
  }, []);

  // لود تنبل: صفحه‌ی بعدیِ اعلان‌های قدیمی‌تر (با اسکرول تا انتهای لیست صدا زده می‌شه)
  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const data = await api("GET", `/api/notifications?cursor=${encodeURIComponent(nextCursor)}`);
      data.notifications.forEach((n) => seen.current.add(n.id));
      setItems((prev) => mergeById(prev, data.notifications));
      setNextCursor(data.nextCursor ?? null);
      setUnread(data.unread);
    } catch {
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [nextCursor]);

  const open = useCallback(
    (n) => {
      if (!n.readAt) {
        setItems((list) => list.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)));
        setUnread((c) => Math.max(0, c - 1));
        api("PATCH", "/api/notifications", { ids: [n.id] }).catch(() => {});
      }
      if (n.url) router.push(n.url);
    },
    [router],
  );

  const markRead = useCallback(async (ids) => {
    setItems((list) => list.map((x) => (ids.includes(x.id) ? { ...x, readAt: x.readAt ?? new Date().toISOString() } : x)));
    try {
      const data = await api("PATCH", "/api/notifications", { ids });
      setUnread(data.unread);
    } catch {}
  }, []);

  const markAllRead = useCallback(async () => {
    setItems((list) => list.map((x) => ({ ...x, readAt: x.readAt ?? new Date().toISOString() })));
    setUnread(0);
    try {
      await api("PATCH", "/api/notifications", { all: true });
    } catch {}
  }, []);

  // حذف از لیست خودِ کاربر (فوری روی صفحه، بعد سرور؛ اگه سرور خطا داد لیست از نو گرفته می‌شه)
  const remove = useCallback(
    async (ids) => {
      if (!ids?.length) return;
      const gone = new Set(ids);
      setItems((list) => list.filter((x) => !gone.has(x.id)));
      setUnread((c) => {
        let dec = 0;
        for (const x of itemsRef.current) if (gone.has(x.id) && !x.readAt) dec += 1;
        return Math.max(0, c - dec);
      });
      try {
        const data = await api("DELETE", "/api/notifications", { ids });
        setUnread(data.unread);
      } catch {
        cursorLoaded.current = false;
        load();
      }
    },
    [load],
  );

  const removeAll = useCallback(async () => {
    setItems([]);
    setUnread(0);
    setNextCursor(null);
    try {
      await api("DELETE", "/api/notifications", { all: true });
    } catch {
      cursorLoaded.current = false;
      load();
    }
  }, [load]);

  const testSound = useCallback(() => play("ORDER_STATUS"), [play]);

  const enable = useCallback(async () => {
    const result = await enablePush();
    setPermission(pushSupported() ? Notification.permission : "unavailable");
    return result;
  }, []);

  // رسیدن اعلان زنده
  const onIncoming = useCallback(
    (n) => {
      if (seen.current.has(n.id)) return;
      seen.current.add(n.id);
      setItems((list) => mergeById([n], list));
      setUnread((c) => c + 1);
      play(n.type);

      const important = ADMIN_NOTIFICATION_TYPES.includes(n.type);
      toast(
        <div>
          <strong className="block text-sm">{n.title}</strong>
          <span className="block text-xs opacity-80">{n.body}</span>
        </div>,
        {
          toastId: n.id,
          autoClose: important ? 12000 : 7000,
          onClick: () => open(n),
        },
      );

      // صفحه‌های پنل که از سرور رندر می‌شن (داشبورد، لیست‌ها) با اعلان تازه به‌روز بشن
      window.dispatchEvent(new CustomEvent("shop:notification", { detail: n }));
      if (important && pathRef.current.startsWith("/admin")) router.refresh();
    },
    [open, play, router],
  );

  // اتصال زنده
  useEffect(() => {
    if (!user) {
      setItems([]);
      setUnread(0);
      setNextCursor(null);
      cursorLoaded.current = false;
      seen.current = new Set();
      return;
    }
    registerServiceWorker();
    syncPush();
    load();

    let es;
    let first = true;
    if (typeof EventSource !== "undefined") {
      es = new EventSource("/api/notifications/stream");
      es.addEventListener("notification", (e) => {
        try {
          onIncoming(JSON.parse(e.data));
        } catch {}
      });
      // بعد از قطع و وصل دوباره، چیزهایی که وسط قطعی رسیده‌اند را از سرور بگیر
      es.onopen = () => {
        if (!first) load();
        first = false;
      };
    }
    const onVisible = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      es?.close();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [user, load, onIncoming]);

  // عدد روی آیکن برنامه (PWA نصب‌شده)
  useEffect(() => {
    try {
      if (unread > 0) navigator.setAppBadge?.(unread);
      else navigator.clearAppBadge?.();
    } catch {}
  }, [unread]);

  const value = useMemo(
    () => ({
      items,
      unread,
      hasMore: nextCursor !== null,
      loadingMore,
      loadMore,
      soundOn,
      setSoundOn,
      permission,
      enable,
      markRead,
      markAllRead,
      remove,
      removeAll,
      testSound,
      open,
    }),
    [items, unread, nextCursor, loadingMore, loadMore, soundOn, setSoundOn, permission, enable, markRead, markAllRead, remove, removeAll, testSound, open],
  );
  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  return useContext(NotificationContext);
}
