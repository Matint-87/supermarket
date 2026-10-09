"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FaBell, FaCheckDouble, FaCheckSquare, FaRegSquare, FaRegTrashAlt, FaTasks, FaTimes, FaVolumeMute, FaVolumeUp } from "react-icons/fa";
import { useAuth } from "@/components/auth/AuthProvider";
import BackButton from "@/components/BackButton";
import { Spinner } from "@/components/ui/form";
import SwipeRow from "@/components/ui/SwipeRow";
import { useNotifications } from "@/components/notifications/NotificationProvider";
import { NOTIFICATION_META } from "@/lib/notification-constants";
import { needsInstallForPush, pushSupported } from "@/lib/push-client";
import { formatJalaliKey, shiftDayKey, tehranTodayKey } from "@/lib/jalali";
import { formatNumber } from "@/lib/format";

function timeAgo(iso) {
  const sec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (sec < 60) return "همین الان";
  if (sec < 3600) return `${formatNumber(Math.floor(sec / 60))} دقیقه پیش`;
  if (sec < 86400) return `${formatNumber(Math.floor(sec / 3600))} ساعت پیش`;
  return `${formatNumber(Math.floor(sec / 86400))} روز پیش`;
}

/** ساعت اعلان به وقت تهران، مثل «۱۴:۳۰» */
function clock(iso) {
  return new Intl.DateTimeFormat("fa-IR", { timeZone: "Asia/Tehran", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(
    new Date(iso),
  );
}

/** کلید روزِ (به وقت تهران) یک اعلان */
const dayKeyOf = (iso) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tehran" }).format(new Date(iso));

/** اعلان‌ها رو بر اساس روز گروه می‌کنه: «امروز»، «دیروز» و بعدش تاریخ شمسی (ترتیب ورودی حفظ می‌شه) */
function groupByDay(list) {
  const today = tehranTodayKey();
  const yesterday = shiftDayKey(today, -1);
  const groups = [];
  for (const n of list) {
    const key = dayKeyOf(n.createdAt);
    let g = groups[groups.length - 1];
    if (!g || g.key !== key) {
      g = { key, label: key === today ? "امروز" : key === yesterday ? "دیروز" : formatJalaliKey(key), isToday: key === today, items: [] };
      groups.push(g);
    }
    g.items.push(n);
  }
  return groups;
}

/**
 * زنگوله‌ی اعلان‌ها.
 *  • موبایل: پنل تمام‌صفحه با دکمه‌ی بازگشت کنار عنوان.
 *  • دسکتاپ: پنل کوچک بازشونده کنار آیکن.
 * وقتی اعلان‌ها زیاد می‌شن: تب «همه / خوانده‌نشده»، گروه‌بندی روزانه (امروز، دیروز، …) و
 * لود تنبل با اسکرول (۳۰ تا ۳۰ تا از سرور گرفته می‌شن) تا لیست سنگین و شلوغ نشه.
 * placement: "header" (هدر سایت، سمت چپ صفحه) | "sidebar" (سایدبار پنل مدیریت، سمت راست)
 * tone: "light" روی پس‌زمینه‌ی روشن | "dark" روی نوار رنگی
 */
export default function NotificationBell({ placement = "header", tone = "light" }) {
  const { user } = useAuth();
  const { items, unread, hasMore, loadingMore, loadMore, soundOn, setSoundOn, testSound, permission, enable, markAllRead, remove, removeAll, open } =
    useNotifications();
  const [show, setShow] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [installHint, setInstallHint] = useState(false);
  const [filter, setFilter] = useState("all"); // all | unread
  const [selecting, setSelecting] = useState(false); // حالت انتخاب چندتایی برای حذف
  const [selected, setSelected] = useState(() => new Set());
  const [confirmAll, setConfirmAll] = useState(false); // نوار تأیید «حذف همه»
  const listRef = useRef(null);
  const sentinelRef = useRef(null);

  useEffect(() => setMounted(true), []);

  function closePanel() {
    setShow(false);
    setSelecting(false);
    setSelected(new Set());
    setConfirmAll(false);
  }

  function toggleSelected(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function endSelecting() {
    setSelecting(false);
    setSelected(new Set());
  }

  // Escape می‌بنده + روی موبایل (پنل تمام‌صفحه) پشت صفحه اسکرول نمی‌کنه
  useEffect(() => {
    if (!show) return;
    const onKey = (e) => e.key === "Escape" && closePanel();
    document.addEventListener("keydown", onKey);
    const fullScreen = window.matchMedia("(max-width: 767px)").matches;
    const prev = document.body.style.overflow;
    if (fullScreen) document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [show]);

  const visible = useMemo(() => (filter === "unread" ? items.filter((n) => !n.readAt) : items), [items, filter]);
  const groups = useMemo(() => groupByDay(visible), [visible]);

  // لود تنبل: وقتی انتهای لیست (sentinel) دیده شد صفحه‌ی بعد رو بگیر.
  // توی تب «خوانده‌نشده» اگه چیز کمی هست و sentinel هنوز دیده می‌شه، خودکار ادامه می‌ده تا لیست پر بشه یا تموم بشه.
  useEffect(() => {
    if (!show || !hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { root: listRef.current, rootMargin: "240px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [show, hasMore, loadMore, filter, visible.length]);

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
            {/* پس‌زمینه‌ی کلیک‌خور فقط برای دسکتاپ؛ توی موبایل خودِ پنل کل صفحه رو می‌گیره */}
            <div className="fixed inset-0 z-[190] hidden md:block" onClick={closePanel} aria-hidden="true" />
            <div
              role="dialog"
              aria-modal="true"
              aria-label="اعلان‌ها"
              dir="rtl"
              className={`fixed inset-0 z-[200] flex h-dvh flex-col overflow-hidden bg-white font-[Number] md:inset-auto md:h-auto md:max-h-[75dvh] md:w-96 md:rounded-2xl md:border md:border-slate-200 md:shadow-pop ${pos}`}
            >
              {/* سربرگ: دکمه‌ی بازگشت (فقط موبایل) + عنوان + صدا + انتخاب + حذف همه + خواندن همه */}
              {selecting ? (
                <div className="flex items-center gap-2 border-b border-slate-100 px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] md:px-4">
                  <button
                    type="button"
                    onClick={endSelecting}
                    aria-label="لغو انتخاب"
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:text-slate-800 md:h-8 md:w-8"
                  >
                    <FaTimes size={13} />
                  </button>
                  <span className="text-sm font-extrabold text-slate-800">
                    {selected.size > 0 ? `${formatNumber(selected.size)} انتخاب‌شده` : "انتخاب اعلان‌ها"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelected(selected.size === visible.length ? new Set() : new Set(visible.map((n) => n.id)))}
                    className="ms-auto flex h-9 items-center rounded-lg bg-slate-100 px-3 text-xs font-bold text-slate-600 hover:bg-slate-200 md:h-8"
                  >
                    {selected.size === visible.length && visible.length > 0 ? "لغو همه" : "انتخاب همه"}
                  </button>
                  <button
                    type="button"
                    disabled={selected.size === 0}
                    onClick={() => {
                      remove([...selected]);
                      endSelecting();
                    }}
                    className="flex h-9 items-center gap-1.5 rounded-lg bg-red-500 px-3 text-xs font-bold text-white hover:bg-red-600 disabled:opacity-40 md:h-8"
                  >
                    <FaRegTrashAlt size={12} /> حذف
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 border-b border-slate-100 px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] md:px-4">
                  <BackButton hideOn={[]} onClick={closePanel} label="بستن اعلان‌ها" className="h-9 w-9 md:hidden" />
                  <span className="text-base font-extrabold text-slate-800 md:text-sm">اعلان‌ها</span>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !soundOn;
                      setSoundOn(next);
                      if (next) setTimeout(testSound, 0); // با روشن‌کردن، یک بار صدا رو می‌شنوی (و قفل صدای مرورگر هم باز می‌شه)
                    }}
                    aria-label={soundOn ? "خاموش کردن صدا" : "روشن کردن صدا"}
                    className="ms-auto flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:text-slate-800 md:h-8 md:w-8"
                  >
                    {soundOn ? <FaVolumeUp size={13} /> : <FaVolumeMute size={13} />}
                  </button>
                  {items.length > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={() => setSelecting(true)}
                        aria-label="انتخاب اعلان‌ها"
                        className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:text-slate-800 md:h-8 md:w-8"
                      >
                        <FaTasks size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmAll((v) => !v)}
                        aria-label="حذف همه‌ی اعلان‌ها"
                        className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-600 md:h-8 md:w-8"
                      >
                        <FaRegTrashAlt size={13} />
                      </button>
                    </>
                  )}
                  {unread > 0 && (
                    <button
                      type="button"
                      onClick={markAllRead}
                      className="flex h-9 items-center gap-1.5 rounded-lg bg-green-50 px-3 text-xs font-bold text-green-700 hover:bg-green-100 md:h-8"
                    >
                      <FaCheckDouble size={11} /> خواندن همه
                    </button>
                  )}
                </div>
              )}

              {confirmAll && (
                <div className="flex items-center gap-2 border-b border-red-100 bg-red-50 px-4 py-2.5 text-xs text-red-700">
                  <p className="flex-1 font-medium">همه‌ی اعلان‌ها پاک شوند؟</p>
                  <button
                    type="button"
                    onClick={() => {
                      removeAll();
                      setConfirmAll(false);
                    }}
                    className="rounded-lg bg-red-500 px-3 py-1.5 font-bold text-white hover:bg-red-600"
                  >
                    حذف همه
                  </button>
                  <button type="button" onClick={() => setConfirmAll(false)} className="rounded-lg bg-white px-3 py-1.5 font-bold text-slate-600 hover:bg-slate-100">
                    انصراف
                  </button>
                </div>
              )}

              {/* تب‌ها: همه / خوانده‌نشده */}
              <div role="tablist" aria-label="فیلتر اعلان‌ها" className="flex gap-2 border-b border-slate-100 px-3 py-2 md:px-4">
                {[
                  { value: "all", label: "همه" },
                  { value: "unread", label: unread > 0 ? `خوانده‌نشده (${formatNumber(unread)})` : "خوانده‌نشده" },
                ].map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    role="tab"
                    aria-selected={filter === t.value}
                    onClick={() => {
                      setFilter(t.value);
                      listRef.current?.scrollTo({ top: 0 });
                    }}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                      filter === t.value ? "bg-green-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
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

              {/* لیست اعلان‌ها (گروه‌بندی‌شده بر اساس روز) */}
              <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]">
                {groups.length === 0 && !hasMore && (
                  <p className="px-4 py-16 text-center text-sm text-slate-400">
                    {filter === "unread" ? "اعلان خوانده‌نشده‌ای ندارید" : "اعلانی ندارید"}
                  </p>
                )}

                {groups.map((g) => (
                  <section key={g.key}>
                    {/* عنوان روز؛ موقع اسکرول بالای لیست می‌چسبه */}
                    <h3 className="sticky top-0 z-10 bg-slate-50/95 px-4 py-1.5 text-[11px] font-bold text-slate-500 backdrop-blur">
                      {g.label}
                    </h3>
                    <ul className="divide-y divide-slate-100">
                      {g.items.map((n) => {
                        const meta = NOTIFICATION_META[n.type] ?? NOTIFICATION_META.ORDER_STATUS;
                        return (
                          <li key={n.id}>
                            <SwipeRow disabled={selecting} onDismiss={() => remove([n.id])}>
                              <button
                                type="button"
                                onClick={() => {
                                  if (selecting) return toggleSelected(n.id);
                                  closePanel();
                                  open(n);
                                }}
                                className={`flex w-full items-start gap-3 px-4 py-3 text-start transition hover:bg-slate-50 active:bg-slate-100 ${
                                  selecting && selected.has(n.id) ? "bg-green-50" : n.readAt ? "" : "bg-green-50/50"
                                }`}
                              >
                                {selecting && (
                                  <span className={`mt-0.5 shrink-0 ${selected.has(n.id) ? "text-green-600" : "text-slate-300"}`} aria-hidden="true">
                                    {selected.has(n.id) ? <FaCheckSquare size={18} /> : <FaRegSquare size={18} />}
                                  </span>
                                )}
                                <span className="flex min-w-0 flex-1 flex-col gap-1">
                                  <span className="flex items-center gap-2">
                                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.tone}`}>{meta.label}</span>
                                    {!n.readAt && <span className="h-2 w-2 rounded-full bg-green-600" aria-hidden="true" />}
                                    <span className="ms-auto text-[11px] text-slate-400">{g.isToday ? timeAgo(n.createdAt) : clock(n.createdAt)}</span>
                                  </span>
                                  <span className="text-sm font-bold text-slate-800">{n.title}</span>
                                  <span className="break-words text-xs leading-5 text-slate-600">{n.body}</span>
                                </span>
                              </button>
                            </SwipeRow>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ))}

                {/* انتهای لیست: با دیده‌شدنش صفحه‌ی بعد لود می‌شه؛ دکمه هم برای مواقعی که observer کار نکنه */}
                {hasMore && (
                  <div ref={sentinelRef} className="flex justify-center px-4 py-4">
                    {loadingMore ? (
                      <Spinner />
                    ) : (
                      <button type="button" onClick={loadMore} className="rounded-full bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200">
                        نمایش اعلان‌های قدیمی‌تر
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>,
          document.body,
        )}
    </>
  );
}
