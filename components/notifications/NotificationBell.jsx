"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FaBell, FaVolumeMute, FaVolumeUp } from "react-icons/fa";
import { useAuth } from "@/components/auth/AuthProvider";
import { useNotifications } from "@/components/notifications/NotificationProvider";
import { NOTIFICATION_META } from "@/lib/notification-constants";
import { needsInstallForPush, pushSupported } from "@/lib/push-client";
import { formatNumber } from "@/lib/format";

function timeAgo(iso) {
  const sec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (sec < 60) return "همین الان";
  if (sec < 3600) return `${formatNumber(Math.floor(sec / 60))} دقیقه پیش`;
  if (sec < 86400) return `${formatNumber(Math.floor(sec / 3600))} ساعت پیش`;
  return `${formatNumber(Math.floor(sec / 86400))} روز پیش`;
}

/**
 * زنگوله‌ی اعلان‌ها با پنل بازشونده.
 * placement: "header" (هدر سایت، سمت چپ صفحه) | "sidebar" (سایدبار پنل مدیریت، سمت راست)
 * tone: "light" روی پس‌زمینه‌ی روشن | "dark" روی نوار سبز
 */
export default function NotificationBell({ placement = "header", tone = "light" }) {
  const { user } = useAuth();
  const { items, unread, soundOn, setSoundOn, permission, enable, markAllRead, open } = useNotifications();
  const [show, setShow] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [installHint, setInstallHint] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!show) return;
    const onKey = (e) => e.key === "Escape" && setShow(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [show]);

  if (!user) return null;

  const btn =
    tone === "dark"
      ? "bg-white/15 text-white hover:bg-white/25"
      : "bg-slate-100 text-slate-600 hover:bg-green-50 hover:text-green-700";
  const pos = placement === "sidebar" ? "md:right-[17rem] md:top-4 md:left-auto" : "md:left-4 md:top-16 md:right-auto";
  const canEnable = pushSupported() && permission !== "granted" && permission !== "denied";

  async function onEnable() {
    if (needsInstallForPush()) return setInstallHint(true);
    await enable();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-label={unread > 0 ? `اعلان‌ها (${formatNumber(unread)} خوانده‌نشده)` : "اعلان‌ها"}
        className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition ${btn}`}
      >
        <FaBell size={16} />
        {unread > 0 && (
          <span className="absolute -end-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white ring-2 ring-white">
            {unread > 99 ? "+۹۹" : formatNumber(unread)}
          </span>
        )}
      </button>

      {mounted &&
        show &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[190]" onClick={() => setShow(false)} aria-hidden="true" />
            <div
              role="dialog"
              aria-label="اعلان‌ها"
              dir="rtl"
              className={`fixed inset-x-2 top-16 z-[200] flex max-h-[75dvh] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white font-[Number] shadow-pop md:inset-x-auto md:w-96 ${pos}`}
            >
              <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
                <span className="text-sm font-extrabold text-slate-800">اعلان‌ها</span>
                <button
                  type="button"
                  onClick={() => setSoundOn(!soundOn)}
                  aria-label={soundOn ? "خاموش کردن صدا" : "روشن کردن صدا"}
                  className="ms-auto flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:text-slate-800"
                >
                  {soundOn ? <FaVolumeUp size={13} /> : <FaVolumeMute size={13} />}
                </button>
                {unread > 0 && (
                  <button type="button" onClick={markAllRead} className="text-xs font-medium text-green-700 hover:underline">
                    خواندن همه
                  </button>
                )}
              </div>

              {(canEnable || installHint) && (
                <div className="border-b border-amber-100 bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
                  {installHint ? (
                    <p>برای دریافت اعلان در آیفون، سایت را از منوی اشتراک‌گذاری به «صفحه‌ی اصلی» اضافه کنید و از همان‌جا باز کنید.</p>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="flex-1">با فعال‌سازی، اعلان‌ها حتی وقتی سایت بسته است روی این دستگاه می‌رسند.</p>
                      <button type="button" onClick={onEnable} className="shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 font-bold text-white">
                        فعال‌سازی
                      </button>
                    </div>
                  )}
                </div>
              )}
              {permission === "denied" && (
                <p className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs text-slate-500">
                  اعلان این سایت در مرورگر مسدود شده؛ از تنظیمات سایت در مرورگر باز کنید.
                </p>
              )}

              <ul className="flex-1 divide-y divide-slate-100 overflow-y-auto">
                {items.length === 0 && <li className="px-4 py-10 text-center text-sm text-slate-400">اعلانی ندارید</li>}
                {items.map((n) => {
                  const meta = NOTIFICATION_META[n.type] ?? NOTIFICATION_META.ORDER_STATUS;
                  return (
                    <li key={n.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setShow(false);
                          open(n);
                        }}
                        className={`flex w-full flex-col gap-1 px-4 py-3 text-start transition hover:bg-slate-50 ${n.readAt ? "" : "bg-green-50/50"}`}
                      >
                        <span className="flex items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.tone}`}>{meta.label}</span>
                          {!n.readAt && <span className="h-2 w-2 rounded-full bg-green-600" aria-hidden="true" />}
                          <span className="ms-auto text-[11px] text-slate-400">{timeAgo(n.createdAt)}</span>
                        </span>
                        <span className="text-sm font-bold text-slate-800">{n.title}</span>
                        <span className="text-xs leading-5 text-slate-600">{n.body}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </>,
          document.body,
        )}
    </>
  );
}
