"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { useAuth } from "@/components/auth/AuthProvider";
import { api } from "@/lib/api-client";
import { ADMIN_NOTIFICATION_TYPES } from "@/lib/notification-constants";
import { enablePush, pushSupported, registerServiceWorker, syncPush } from "@/lib/push-client";

const NotificationContext = createContext({
  items: [],
  unread: 0,
  soundOn: true,
  setSoundOn: () => {},
  permission: "unavailable",
  enable: async () => {},
  markRead: async () => {},
  markAllRead: async () => {},
  open: (n) => {},
});

const SOUND_KEY = "shop:notif-sound";

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
  const [soundOn, setSoundOnState] = useState(true);
  const [permission, setPermission] = useState("unavailable");
  const audio = useRef({ notify: null, order: null, unlocked: false });
  const seen = useRef(new Set());
  const pathRef = useRef(pathname);
  pathRef.current = pathname;
  const soundRef = useRef(true);

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

  // مرورگرها قبل از اولین تعامل کاربر اجازه‌ی پخش صدا نمی‌دهند؛ با اولین کلیک/لمس «قفل صدا» باز می‌شود
  useEffect(() => {
    audio.current.notify = new Audio("/sounds/notify.wav");
    audio.current.order = new Audio("/sounds/order.wav");
    const unlock = async () => {
      if (audio.current.unlocked) return;
      for (const a of [audio.current.notify, audio.current.order]) {
        try {
          a.muted = true;
          await a.play();
          a.pause();
          a.currentTime = 0;
          a.muted = false;
        } catch {}
      }
      audio.current.unlocked = true;
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  const play = useCallback((type) => {
    if (!soundRef.current) return;
    const a = type === "ORDER_NEW" ? audio.current.order : audio.current.notify;
    if (!a) return;
    try {
      a.currentTime = 0;
      a.play().catch(() => {});
    } catch {}
  }, []);

  const load = useCallback(async () => {
    try {
      const data = await api("GET", "/api/notifications");
      data.notifications.forEach((n) => seen.current.add(n.id));
      setItems(data.notifications);
      setUnread(data.unread);
    } catch {}
  }, []);

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
      setItems((list) => [n, ...list].slice(0, 50));
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
    () => ({ items, unread, soundOn, setSoundOn, permission, enable, markRead, markAllRead, open }),
    [items, unread, soundOn, setSoundOn, permission, enable, markRead, markAllRead, open],
  );
  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  return useContext(NotificationContext);
}
