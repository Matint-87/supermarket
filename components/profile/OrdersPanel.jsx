"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  FaBan,
  FaBoxOpen,
  FaTruck,
  FaCheckCircle,
  FaChevronDown,
  FaClock,
  FaFileInvoice,
  FaTimesCircle,
  FaUndoAlt,
} from "react-icons/fa";
import CancelOrderFlow from "@/components/orders/CancelOrderFlow";
import OrderTimeline from "@/components/orders/OrderTimeline";
import PayPanel from "@/components/orders/PayPanel";
import { api } from "@/lib/api-client";
import { formatNumber, formatToman } from "@/lib/format";
import { formatJalaliDate, formatJalaliDateTime } from "@/lib/jalali";
import { toFaDigits } from "@/lib/phone";
import {
  PAYMENT_STATUS_META,
  USER_CANCELABLE_STATUSES,
  postTrackingUrl,
} from "@/lib/order-constants";
import { SHIPPING_LABELS, deliveryMessage } from "@/lib/shipping";
import { notify, useToastOnChange } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

// هر تب چند وضعیت رو کنار هم نشون می‌ده («جاری» = در انتظار + در حال آماده‌سازی)
const TABS = [
  { key: "CURRENT", label: "جاری", statuses: ["PENDING", "PROCESSING", "SHIPPING"] },
  { key: "DELIVERED", label: "تحویل شده", statuses: ["DELIVERED"] },
  { key: "CANCELED", label: "لغو شده", statuses: ["CANCELED"] },
];

const STATUS_META = {
  PENDING: { label: "در انتظار بررسی", icon: FaClock, color: "text-amber-600 bg-amber-50" },
  PROCESSING: { label: "در حال آماده‌سازی", icon: FaBoxOpen, color: "text-sky-700 bg-sky-50" },
  SHIPPING: { label: "در حال ارسال", icon: FaTruck, color: "text-violet-700 bg-violet-50" },
  DELIVERED: { label: "تحویل شده", icon: FaCheckCircle, color: "text-green-700 bg-green-50" },
  RETURNED: { label: "مرجوع شده", icon: FaUndoAlt, color: "text-slate-600 bg-slate-100" },
  CANCELED: { label: "لغو شده", icon: FaTimesCircle, color: "text-red-600 bg-red-50" },
};

const MAX_THUMBS = 4;

// بندانگشتیِ کالا؛ اگه عکس لود نشد کلاً حذف می‌شه (به‌جای پلیس‌هولدر)
function OrderThumb({ item, onFail }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={item.imageUrl}
      alt={item.name}
      loading="lazy"
      onError={onFail}
      className="h-14 w-14 rounded-lg border border-slate-100 bg-slate-50 object-contain"
    />
  );
}

function OrderCard({ order, walletBalance, onChanged }) {
  const [open, setOpen] = useState(false);
  const [paying, setPaying] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const meta = STATUS_META[order.status];
  const StatusIcon = meta.icon;
  const [brokenIds, setBrokenIds] = useState([]);
  // فقط کالاهایی که عکس واقعی دارن (بدون پلیس‌هولدر خاکستری)
  const thumbs = order.items.filter((it) => it.imageUrl && !brokenIds.includes(it.id));
  const extra = thumbs.length - MAX_THUMBS;
  const pay = order.payment;
  const isDead = order.status === "CANCELED" || order.status === "RETURNED";
  const payMeta = PAYMENT_STATUS_META[pay.status];
  const canCancel = USER_CANCELABLE_STATUSES.includes(order.status);

  async function handleCancel(reason) {
    try {
      const data = await api("POST", `/api/orders/${order.code}/cancel`, { reason });
      notify.success(
        data.refunded > 0
          ? `سفارش لغو شد و ${formatToman(data.refunded)} به کیف پول شما برگشت.`
          : "سفارش لغو شد.",
      );
      onChanged(data.order, data.walletBalance);
    } catch (err) {
      notify.error(err.message);
      throw err;
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 transition hover:border-green-200 hover:shadow-soft">
      <div className="mb-3 flex items-center justify-between">
        <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${meta.color}`}>
          <StatusIcon size={12} />
          {meta.label}
        </span>
        <span className="text-xs text-slate-500">{formatJalaliDate(order.createdAt)}</span>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
        <span>
          کد سفارش: <span className="font-medium text-slate-700">{toFaDigits(order.code)}</span>
        </span>
        <span className="text-slate-300">|</span>
        <span>
          مبلغ: <span className="font-bold text-slate-800">{formatNumber(order.payable)}</span> تومان
        </span>
        {!isDead && (
          <>
            <span className="text-slate-300">|</span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${payMeta.color}`}>{payMeta.label}</span>
          </>
        )}
      </div>

      <OrderTimeline order={order} />

      {order.status === "SHIPPING" && (
        <div className="mb-3 rounded-xl bg-violet-50 p-3 text-xs leading-6 text-violet-800">
          {order.shippedAt && <p>ارسال شده در {formatJalaliDateTime(order.shippedAt)}</p>}
          {order.trackingCode && (
            <p>
              کد رهگیری پست: <span className="font-bold" dir="ltr">{order.trackingCode}</span>{" "}
              <a href={postTrackingUrl(order.trackingCode)} target="_blank" rel="noopener" className="font-bold underline underline-offset-4">
                رهگیری مرسوله ↗
              </a>
            </p>
          )}
        </div>
      )}
      {order.status === "DELIVERED" && order.deliveredAt && (
        <p className="mb-3 rounded-xl bg-green-50 p-3 text-xs text-green-800">تحویل شده در {formatJalaliDateTime(order.deliveredAt)}</p>
      )}

      {order.status === "CANCELED" && (
        <p className="mb-3 rounded-xl bg-red-50 p-3 text-xs leading-6 text-red-700">
          <span className="font-bold">دلیل لغو: </span>
          {order.cancelReason || "—"}
          {order.canceledBy === "ADMIN" && " (توسط فروشگاه)"}
          {pay.refunded > 0 && (
            <>
              <br />
              <span className="font-bold">{formatToman(pay.refunded)}</span> به کیف پول شما برگشت داده شد.
            </>
          )}
        </p>
      )}

      {thumbs.length > 0 && (
        <div className="mb-3 flex items-center gap-2">
          {thumbs.slice(0, MAX_THUMBS).map((it) => (
            <OrderThumb key={it.id} item={it} onFail={() => setBrokenIds((ids) => [...ids, it.id])} />
          ))}
          {extra > 0 && (
            <span className="flex h-14 w-14 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500">
              +{formatNumber(extra)}
            </span>
          )}
        </div>
      )}

      {pay.canPay && (
        <div className="mb-3">
          {paying ? (
            <PayPanel
              order={order}
              walletBalance={walletBalance}
              onPaid={() => {
                setPaying(false);
                onChanged(null, null, true);
              }}
            />
          ) : (
            <button
              type="button"
              onClick={() => setPaying(true)}
              className={cn(buttonVariants({ size: "default" }), "w-full")}
            >
              پرداخت سفارش ({formatToman(pay.remaining)})
            </button>
          )}
          {pay.awaitingConfirmation && (
            <p className="mt-2 text-xs text-amber-700">بخشی از پرداخت شما در انتظار تأیید فروشگاه است.</p>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex items-center gap-1.5 text-xs font-medium text-green-700 hover:text-green-800"
        >
          {open ? "بستن جزئیات" : "مشاهده جزئیات سفارش"}
          <FaChevronDown size={11} className={`transition ${open ? "rotate-180" : ""}`} />
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {canCancel && (
            <button
              type="button"
              onClick={() => setCanceling(true)}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-red-600 ring-1 ring-red-200 transition hover:bg-red-50"
            >
              <FaBan size={12} /> لغو سفارش
            </button>
          )}
          <a
            href={`/profile/orders/${order.code}/invoice`}
            target="_blank"
            rel="noopener"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "flex")}
          >
            <FaFileInvoice size={12} /> مشاهده فاکتور
          </a>
        </div>
      </div>

      <CancelOrderFlow open={canceling} onOpenChange={setCanceling} order={order} onSubmit={handleCancel} />

      {open && (
        <div className="mt-3 space-y-3 border-t border-slate-100 pt-3 text-xs">
          <ul className="space-y-2">
            {order.items.map((it) => (
              <li key={it.id} className="flex items-start justify-between gap-3">
                <span className="min-w-0 text-slate-700">
                  {it.name} <span className="text-slate-400">({it.unitLabel})</span>
                  <span className="ms-2 text-slate-500">× {formatNumber(it.quantity)}</span>
                </span>
                <span className="shrink-0 font-medium text-slate-800">{formatToman(it.finalPrice * it.quantity)}</span>
              </li>
            ))}
          </ul>

          <div className="space-y-1 border-t border-slate-100 pt-3 text-slate-600">
            <div className="flex justify-between"><span>جمع کالاها</span><span>{formatToman(order.itemsTotal)}</span></div>
            {order.discountTotal > 0 && (
              <div className="flex justify-between text-rose-600"><span>تخفیف</span><span>{formatToman(order.discountTotal)}</span></div>
            )}
            <div className="flex justify-between">
              <span>هزینه‌ی ارسال</span>
              <span>{order.shippingFee > 0 ? formatToman(order.shippingFee) : "رایگان"}</span>
            </div>
            <div className="flex justify-between font-bold text-slate-800"><span>مبلغ قابل پرداخت</span><span>{formatToman(order.payable)}</span></div>
          </div>

          <p className="leading-6 text-slate-500">
            <span className="font-bold text-slate-700">آدرس تحویل: </span>
            {order.address.province}، {order.address.city}، {order.address.addressLine} — کد پستی:{" "}
            {toFaDigits(order.address.postalCode)} — گیرنده: {order.address.recipientName}
          </p>
          <p className="leading-6 text-slate-500">
            <span className="font-bold text-slate-700">روش ارسال: </span>
            {SHIPPING_LABELS[order.shippingMethod] ?? "—"} — {deliveryMessage(order.shippingMethod, order.address.city, order.deliveryTime)}
          </p>
          {order.note && (
            <p className="leading-6 text-slate-500">
              <span className="font-bold text-slate-700">توضیحات: </span>
              {order.note}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

const PAGE_SIZE = 10;

export default function OrdersPanel() {
  const [activeTab, setActiveTab] = useState("CURRENT");
  const [orders, setOrders] = useState(null); // null = در حال لود اولین صفحه‌ی تب
  const [counts, setCounts] = useState({});
  const [nextCursor, setNextCursor] = useState(null); // null = همه‌ی سفارش‌های تب لود شده
  const [loadingMore, setLoadingMore] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [error, setError] = useState("");
  useToastOnChange(error);

  const sentinelRef = useRef(null);
  const busyRef = useRef(false);
  const genRef = useRef(0); // «نسل» لیست؛ با عوض‌شدن تب، پاسخ‌های کهنه نادیده گرفته می‌شن

  const tab = TABS.find((t) => t.key === activeTab);

  /** اولین صفحه‌ی تب فعال (۱۰ تای اول) + شمارنده‌ی تب‌ها + موجودی کیف پول */
  const load = useCallback(() => {
    const gen = ++genRef.current;
    busyRef.current = false;
    return api("GET", `/api/orders?group=${activeTab}&limit=${PAGE_SIZE}`)
      .then((d) => {
        if (gen !== genRef.current) return;
        setOrders(d.orders);
        setNextCursor(d.nextCursor ?? null);
        setCounts(d.counts ?? {});
        setWalletBalance(d.walletBalance ?? 0);
      })
      .catch((err) => {
        if (gen !== genRef.current) return;
        setError(err.message);
        setOrders((cur) => cur ?? []);
      });
  }, [activeTab]);

  /** صفحه‌ی بعدی با رسیدن اسکرول به انتهای لیست */
  const loadMore = useCallback(async () => {
    if (busyRef.current || !nextCursor) return;
    busyRef.current = true;
    const gen = genRef.current;
    setLoadingMore(true);
    try {
      const d = await api("GET", `/api/orders?group=${activeTab}&limit=${PAGE_SIZE}&cursor=${nextCursor}`);
      if (gen !== genRef.current) return;
      setOrders((prev) => {
        const seen = new Set(prev.map((o) => o.id));
        return [...prev, ...d.orders.filter((o) => !seen.has(o.id))];
      });
      setNextCursor(d.nextCursor ?? null);
    } catch (err) {
      if (gen === genRef.current) {
        setError(err.message);
        setNextCursor(null); // تا با دیدن sentinel حلقه‌ی درخواست خطادار نسازیم
      }
    } finally {
      if (gen === genRef.current) {
        busyRef.current = false;
        setLoadingMore(false);
      }
    }
  }, [activeTab, nextCursor]);

  useEffect(() => {
    load();
  }, [load]);

  /** لیست رو خالی می‌کنه تا اسکلتون نشون داده بشه (قبل از عوض‌کردن تب یا گرفتن دوباره‌ی لیست) */
  function resetList() {
    setOrders(null);
    setNextCursor(null);
    setError("");
  }

  function selectTab(key) {
    if (key === activeTab) return;
    resetList();
    setActiveTab(key);
  }

  // نتیجه‌ی برگشت از درگاه: ?pay=success|failed|refunded&order=کد
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const result = sp.get("pay");
    if (result) {
      const code = sp.get("order");
      const suffix = code ? ` (سفارش ${toFaDigits(code)})` : "";
      if (result === "success") notify.success(`پرداخت با موفقیت انجام شد${suffix}.`);
      else if (result === "refunded") notify.warning(`سفارش قبلاً لغو شده بود؛ مبلغ پرداختی به کیف پول شما برگشت داده شد${suffix}.`, { autoClose: 9000 });
      else notify.error(`پرداخت انجام نشد${suffix}. اگر مبلغی کسر شده تا ۷۲ ساعت به حساب شما برمی‌گردد.`, { autoClose: 9000 });
      sp.delete("pay");
      sp.delete("order");
      const qs = sp.toString();
      window.history.replaceState(null, "", window.location.pathname + (qs ? `?${qs}` : ""));
    }
  }, []);

  // سنسور انتهای لیست → ۱۰ سفارش بعدی (orders.length توی وابستگی‌هاست تا اگه سنسور هنوز توی دید بود، دسته‌ی بعدی هم لود بشه)
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !nextCursor) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "300px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [nextCursor, orders?.length, loadMore]);

  /** بعد از پرداخت/لغو: سفارش لغوشده رو جایگزین کن (اگه دیگه به این تب تعلق نداره حذفش کن) یا کل تب رو دوباره بگیر */
  function handleChanged(updatedOrder, newBalance, reload) {
    if (reload) {
      resetList();
      return load();
    }
    setOrders((list) => list.map((o) => (o.id === updatedOrder.id ? updatedOrder : o)).filter((o) => tab.statuses.includes(o.status)));
    if (typeof newBalance === "number") setWalletBalance(newBalance);
    // شمارنده‌ی تب‌ها بعد از لغو عوض می‌شه
    api("GET", `/api/orders?group=${activeTab}&limit=1`)
      .then((d) => d.counts && setCounts(d.counts))
      .catch(() => {});
  }

  return (
    <div>
      <h2 className="mb-4 text-sm font-bold text-slate-800">تاریخچه سفارشات</h2>

      <div role="tablist" className="mb-4 flex items-center gap-1 overflow-x-auto border-b border-slate-100">
        {TABS.map((t) => {
          const count = counts[t.key] ?? 0;
          const active = activeTab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => selectTab(t.key)}
              className={`relative flex shrink-0 items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition ${
                active ? "text-green-700" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {t.label}
              {count > 0 && (
                <span
                  className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold ${
                    active ? "bg-green-700 text-white" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {formatNumber(count)}
                </span>
              )}
              {active && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-green-700" />}
            </button>
          );
        })}
      </div>

      {orders === null ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-36 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : error && orders.length === 0 ? (
        <p className="rounded-xl border border-dashed border-red-200 py-10 text-center text-xs text-red-500">{error}</p>
      ) : orders.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 py-10 text-center text-xs text-slate-400">
          سفارشی در این بخش وجود ندارد
        </p>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} walletBalance={walletBalance} onChanged={handleChanged} />
          ))}
          {loadingMore && <div className="h-36 animate-pulse rounded-xl bg-slate-100" />}
          {/* سنسور انتهای لیست */}
          {nextCursor && <div ref={sentinelRef} className="h-1 w-full" />}
        </div>
      )}
    </div>
  );
}
