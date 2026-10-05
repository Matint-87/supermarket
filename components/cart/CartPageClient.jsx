"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  FaBan,
  FaCheckCircle,
  FaChevronRight,
  FaFileInvoice,
  FaMapMarkerAlt,
  FaMotorcycle,
  FaRegTrashAlt,
  FaShoppingBasket,
  FaStore,
  FaTimesCircle,
  FaTruck,
} from "react-icons/fa";
import { useAuth } from "@/components/auth/AuthProvider";
import LazyImage from "@/components/LazyImage";
import { api } from "@/lib/api-client";
import { clearCart, removeFromCart, syncCart } from "@/lib/cart-store";
import { formatNumber, formatToman } from "@/lib/format";
import { toFaDigits } from "@/lib/phone";
import { formatUnitAmount } from "@/lib/product-constants";
import { deliveryMessage } from "@/lib/shipping";
import { isAddressComplete } from "@/lib/validators";
import CancelOrderFlow from "@/components/orders/CancelOrderFlow";
import PayPanel from "@/components/orders/PayPanel";
import { USER_CANCELABLE_STATUSES } from "@/lib/order-constants";
import AddToCartButton from "./AddToCartButton";
import { useCart } from "./useCart";
import { notify } from "@/lib/toast";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { useStoreStatus } from "@/components/providers/StoreStatusProvider";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

const LOGIN_URL = `/auth/login?next=${encodeURIComponent("/cart")}`;

// ───────────── یک ردیف کالا ─────────────

function CartItemRow({ item }) {
  const { p, qty } = item;
  const hasDiscount = p.discountPercent > 0;

  return (
    <li className="flex gap-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm sm:gap-4 sm:p-4">
      <LazyImage src={p.imageUrl || ""} alt={p.name} className="h-24 w-24 shrink-0 rounded-xl bg-slate-50 sm:h-28 sm:w-28" />

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="line-clamp-2 text-sm font-medium leading-6 text-slate-800">{p.name}</h3>
            <p className="text-xs text-slate-400">{formatUnitAmount(p.amount, p.unit)}</p>
          </div>
          <button
            type="button"
            onClick={() => removeFromCart(p.id)}
            aria-label={`حذف ${p.name} از سبد`}
            className="shrink-0 rounded-full p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-500"
          >
            <FaRegTrashAlt size={14} />
          </button>
        </div>

        <div className="mt-auto flex flex-wrap items-end justify-between gap-2 pt-2">
          <AddToCartButton product={p} />

          <div className="text-end">
            {hasDiscount && (
              <div className="flex items-center justify-end gap-1.5">
                <del className="text-xs text-slate-400">{formatNumber(p.price * qty)}</del>
                <span className="rounded-md bg-orange-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  ٪{formatNumber(p.discountPercent)}
                </span>
              </div>
            )}
            <span className="text-base font-extrabold text-slate-800">
              {formatNumber(p.finalPrice * qty)}
              <span className="ms-1 text-[11px] font-medium text-slate-500">تومان</span>
            </span>
            {qty > 1 && <p className="text-xs text-slate-400">هر عدد {formatToman(p.finalPrice)}</p>}
          </div>
        </div>
      </div>
    </li>
  );
}

// ───────────── انتخاب آدرس ─────────────

function AddressPicker({ addresses, selectedId, onSelect }) {
  if (addresses === null) {
    return <div className="h-20 animate-pulse rounded-xl bg-slate-100" />;
  }
  if (addresses.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-500">
        هنوز آدرسی ثبت نکرده‌اید.{" "}
        <Link href="/profile?tab=addresses" className="font-bold text-green-700 hover:underline">
          افزودن آدرس
        </Link>
      </p>
    );
  }
  return (
    <div role="radiogroup" aria-label="آدرس تحویل" className="space-y-2">
      {addresses.map((a) => {
        const checked = a.id === selectedId;
        const complete = isAddressComplete(a);
        return (
          <label
            key={a.id}
            className={`flex gap-3 rounded-xl border p-3 text-xs transition ${
              complete ? "cursor-pointer" : "cursor-not-allowed opacity-70"
            } ${
              checked ? "border-green-600 bg-green-50/60 ring-1 ring-green-600/30" : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <input
              type="radio"
              name="address"
              checked={checked}
              disabled={!complete}
              onChange={() => onSelect(a.id)}
              className="mt-1 accent-green-700"
            />
            <span className="min-w-0 flex-1 leading-6">
              <span className="block font-bold text-slate-800">
                {a.label || a.recipientName}
                {a.isDefault && <span className="ms-2 rounded-full bg-green-100 px-2 py-0.5 text-[11px] text-green-700">پیش‌فرض</span>}
              </span>
              <span className="block text-slate-600">
                {a.province}، {a.city}
                {a.neighborhood ? `، ${a.neighborhood}` : ""}، {a.addressLine}
                {a.plaque ? `، پلاک ${toFaDigits(a.plaque)}` : ""}
                {a.unit ? `، واحد ${toFaDigits(a.unit)}` : ""}
              </span>
              <span className="block text-slate-600">
                کد پستی: <span className="font-medium">{a.postalCode ? toFaDigits(a.postalCode) : "—"}</span>
              </span>
              <span className="block text-slate-400">
                گیرنده: {a.recipientName} — {toFaDigits(a.recipientPhone)}
              </span>
              {!complete && (
                <span className="block font-medium text-rose-600">
                  این آدرس ناقص است؛ از بخش «آدرس‌های من» آن را کامل کنید.
                </span>
              )}
            </span>
          </label>
        );
      })}
      <Link href="/profile?tab=addresses" className="inline-block pt-1 text-xs font-medium text-green-700 hover:underline">
        افزودن یا ویرایش آدرس‌ها
      </Link>
    </div>
  );
}

// ───────────── انتخاب روش ارسال ─────────────

const SHIPPING_ICONS = { POST: FaTruck, COURIER: FaMotorcycle, PICKUP: FaStore };

/** quote: خروجی /api/shipping/quote (روش‌های فعال + هزینه + زمان) یا null تا وقتی آدرس انتخاب نشده / در حال لود */
function ShippingPicker({ quote, loading, selected, onSelect, address }) {
  if (!address) {
    return <p className="rounded-xl border border-dashed border-slate-200 p-3 text-center text-xs text-slate-500">ابتدا آدرس تحویل را انتخاب کنید.</p>;
  }
  if (loading && !quote) return <div className="h-24 animate-pulse rounded-xl bg-slate-100" />;
  if (!quote) return <p className="text-xs text-rose-600">دریافت روش‌های ارسال انجام نشد. صفحه را تازه کنید.</p>;

  const methods = quote.methods.filter((m) => m.enabled);
  if (methods.length === 0) {
    return <p className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700">در حال حاضر هیچ روش ارسالی فعال نیست. بعداً دوباره تلاش کنید.</p>;
  }
  const current = methods.find((m) => m.value === selected);

  return (
    <div>
      <div role="radiogroup" aria-label="روش ارسال" className="space-y-2">
        {methods.map((m) => {
          const checked = m.value === selected;
          const Icon = SHIPPING_ICONS[m.value];
          return (
            <label
              key={m.value}
              className={`flex cursor-pointer gap-3 rounded-xl border p-3 text-xs transition ${
                checked ? "border-green-600 bg-green-50/60 ring-1 ring-green-600/30" : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <input type="radio" name="shipping" checked={checked} onChange={() => onSelect(m.value)} className="mt-1 accent-green-700" />
              <Icon className="mt-1 shrink-0 text-green-700" size={15} />
              <span className="min-w-0 flex-1 leading-6">
                <span className="flex items-center justify-between gap-2">
                  <span className="font-bold text-slate-800">{m.label}</span>
                  <span className={`shrink-0 font-bold ${m.fee === 0 ? "text-green-700" : "text-slate-700"}`}>
                    {m.fee === 0 ? "رایگان" : formatToman(m.fee)}
                  </span>
                </span>
                <span className="block text-slate-500">{m.description}</span>
                {m.value !== "PICKUP" && m.fee > 0 && m.freeOver != null && (
                  <span className="block text-xs text-slate-400">ارسال رایگان برای خرید بالای {formatToman(m.freeOver)}</span>
                )}
              </span>
            </label>
          );
        })}
      </div>
      {current && (
        <p className="mt-3 rounded-xl bg-green-50 p-3 text-xs leading-6 text-green-800">
          {deliveryMessage(current.value, address.city, current.deliveryTime)}
          {current.value === "PICKUP" && quote.pickupAddress && (
            <>
              <br />
              <span className="font-bold">آدرس فروشگاه: </span>
              {quote.pickupAddress}
            </>
          )}
        </p>
      )}
      {quote.note && <p className="mt-2 text-xs leading-5 text-slate-500">{quote.note}</p>}
    </div>
  );
}

// ───────────── صفحه‌ی موفقیت ─────────────

function OrderSuccess({ initialOrder, initialBalance }) {
  const [order, setOrder] = useState(initialOrder);
  const [walletBalance, setWalletBalance] = useState(initialBalance);
  const [canceling, setCanceling] = useState(false);

  async function handleCancel(reason) {
    try {
      const data = await api("POST", `/api/orders/${order.code}/cancel`, { reason });
      notify.success(
        data.refunded > 0 ? `سفارش لغو شد و ${formatToman(data.refunded)} به کیف پول شما برگشت.` : "سفارش لغو شد.",
      );
      setOrder(data.order);
      if (typeof data.walletBalance === "number") setWalletBalance(data.walletBalance);
    } catch (err) {
      notify.error(err.message);
      throw err;
    }
  }

  // بعد از پرداخت (کیف پول) وضعیت پرداخت سفارش رو از سرور دوباره بگیر
  async function refresh() {
    try {
      const d = await api("GET", "/api/orders");
      const fresh = d.orders.find((o) => o.id === order.id);
      if (fresh) setOrder(fresh);
      setWalletBalance(d.walletBalance ?? 0);
    } catch {}
  }

  const needsPayment = order.payment?.canPay;
  const isCanceled = order.status === "CANCELED";
  const canCancel = USER_CANCELABLE_STATUSES.includes(order.status);

  return (
    <div className="mx-auto max-w-md rounded-3xl border border-slate-100 bg-white p-6 text-center shadow-sm sm:p-8">
      <span
        className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
          isCanceled ? "bg-red-50 text-red-500" : "bg-green-50 text-green-600"
        }`}
      >
        {isCanceled ? <FaTimesCircle size={36} /> : <FaCheckCircle size={36} />}
      </span>
      <h1 className="mt-4 text-lg font-extrabold text-slate-800">{isCanceled ? "سفارش شما لغو شد" : "سفارش شما ثبت شد"}</h1>
      <p className="mt-2 text-sm leading-7 text-slate-500">
        کد پیگیری: <span className="font-bold text-slate-800">{toFaDigits(order.code)}</span>
        <br />
        مبلغ سفارش: <span className="font-bold text-slate-800">{formatToman(order.payable)}</span>
        {order.shippingFee > 0 && <span className="text-xs"> (با هزینه‌ی ارسال {formatToman(order.shippingFee)})</span>}
      </p>

      {isCanceled ? (
        <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm leading-7 text-red-700">
          {order.payment?.refunded > 0
            ? `${formatToman(order.payment.refunded)} به کیف پول شما برگشت داده شد و در خرید بعدی قابل استفاده است.`
            : "این سفارش لغو شد."}
        </p>
      ) : (
        <>
          {needsPayment ? (
            <div className="mt-4">
              <PayPanel order={order} walletBalance={walletBalance} onPaid={refresh} />
              <p className="mt-2 text-xs leading-5 text-slate-400">
                می‌توانید همین حالا پرداخت کنید یا بعداً از بخش «سفارش‌ها» در حساب کاربری. سفارش تا زمان پرداخت یا لغو، در انتظار می‌ماند.
              </p>
            </div>
          ) : (
            <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">پرداخت این سفارش کامل شد ✓</p>
          )}

          <p className="mt-4 rounded-xl bg-green-50 p-3 text-sm font-medium leading-7 text-green-800">
            {deliveryMessage(order.shippingMethod, order.address.city, order.deliveryTime)}
          </p>
          <p className="mt-3 text-xs text-slate-400">وضعیت سفارش را از بخش «سفارش‌ها» در حساب کاربری پیگیری کنید.</p>
        </>
      )}

      {/* دکمه‌ها: اصلی تمام‌عرض، دو دکمه‌ی فرعی کنار هم، «لغو» به‌صورت لینک کوچک پایین */}
      <div className="mt-6 grid grid-cols-2 gap-2.5">
        <Link
          href="/profile?tab=orders"
          className={cn(buttonVariants({ size: "lg" }), "col-span-2 flex")}
        >
          پیگیری سفارش
        </Link>
        <a
          href={`/profile/orders/${order.code}/invoice`}
          target="_blank"
          rel="noopener"
          className={cn(buttonVariants({ variant: "outline", size: "default" }), "flex px-3")}
        >
          <FaFileInvoice size={14} /> مشاهده فاکتور
        </a>
        <Link
          href="/products"
          className={cn(buttonVariants({ variant: "outline", size: "default" }), "flex px-3")}
        >
          ادامه خرید
        </Link>
      </div>

      {canCancel && (
        <>
          <button
            type="button"
            onClick={() => setCanceling(true)}
            className="mx-auto mt-4 flex items-center gap-1.5 text-xs font-bold text-red-600 transition hover:text-red-700"
          >
            <FaBan size={12} /> لغو سفارش
          </button>
          <CancelOrderFlow open={canceling} onOpenChange={setCanceling} order={order} onSubmit={handleCancel} />
        </>
      )}
    </div>
  );
}

// ───────────── صفحه ─────────────

export default function CartPageClient() {
  const router = useRouter();
  const confirm = useConfirm();
  const { guard, showClosed } = useStoreStatus();
  const { user, loading: authLoading } = useAuth();
  const { items, ready, count, lines, itemsTotal, payable, discount } = useCart();

  const [addresses, setAddresses] = useState(null);
  const [addressId, setAddressId] = useState(null);
  const [shippingMethod, setShippingMethod] = useState(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [order, setOrder] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const synced = useRef(false);

  // هر تغییر قیمت/موجودی که موقع هماهنگی سبد پیدا شد، یک toast هشدار می‌شه
  function showNotices(list) {
    (list ?? []).forEach((n) => notify.warning(n, { autoClose: 8000 }));
  }

  // قیمت/موجودی سبد رو یک‌بار با دیتابیس هماهنگ کن
  useEffect(() => {
    if (!ready || lines === 0 || synced.current) return;
    synced.current = true;
    syncCart()
      .then(showNotices)
      .catch(() => {});
  }, [ready, lines]);

  // آدرس‌های کاربر (اگه واردشده)
  useEffect(() => {
    if (!user) return;
    let alive = true;
    api("GET", "/api/addresses")
      .then((d) => {
        if (!alive) return;
        setAddresses(d.addresses);
        // لیست با «پیش‌فرض» اول مرتب شده؛ اولین آدرسِ کامل پیش‌انتخاب می‌شه
        setAddressId((cur) => cur ?? d.addresses.find(isAddressComplete)?.id ?? null);
      })
      .catch(() => alive && setAddresses([]));
    return () => {
      alive = false;
    };
  }, [user]);

  const selectedAddress = addresses?.find((a) => a.id === addressId) ?? null;

  // روش‌ها و هزینه‌ی ارسال از تنظیمات پنل مدیریت (محدوده‌ها + تنظیمات ارسال) برای شهر آدرس انتخاب‌شده.
  // نتیجه با کلیدِ (استان، شهر، سبد) ذخیره می‌شه؛ تا رسیدن جواب جدید، جواب قبلی نمایش داده می‌شه ولی دکمه‌ی ثبت غیرفعاله.
  const cartKey = items.map((i) => `${i.id}:${i.qty}`).join(",");
  const quoteKey = selectedAddress && items.length > 0 ? `${selectedAddress.province}|${selectedAddress.city}|${cartKey}` : null;
  const [quoteState, setQuoteState] = useState(null); // { key, data }
  useEffect(() => {
    if (!quoteKey) return;
    let alive = true;
    api("POST", "/api/shipping/quote", {
      province: selectedAddress.province,
      city: selectedAddress.city,
      items: items.map((i) => ({ productId: i.id, quantity: i.qty })),
    })
      .then((d) => {
        if (!alive) return;
        setQuoteState({ key: quoteKey, data: d });
        // اگه روش انتخاب‌شده دیگه فعال نیست، انتخاب پاک می‌شه
        setShippingMethod((cur) => (cur && d.methods.some((m) => m.value === cur && m.enabled) ? cur : null));
      })
      .catch(() => alive && setQuoteState({ key: quoteKey, data: null }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteKey]);
  const quote = quoteKey ? (quoteState?.data ?? null) : null;
  const quoteLoading = Boolean(quoteKey) && quoteState?.key !== quoteKey;

  const shippingOption = quote?.methods.find((m) => m.value === shippingMethod) ?? null;
  const shippingFee = shippingOption?.fee ?? 0;
  const grandTotal = payable + shippingFee;

  async function handleCheckout() {
    if (!user) return router.push(LOGIN_URL);
    if (!selectedAddress) return notify.error("آدرس تحویل را انتخاب کنید");
    if (!isAddressComplete(selectedAddress)) {
      return notify.error("آدرس انتخاب‌شده کامل نیست. آدرس را (همراه با کد پستی) تکمیل کنید.");
    }
    if (!shippingMethod) return notify.error("روش ارسال را انتخاب کنید");
    if (!(await guard())) return; // فروشگاه بسته است → مودال تعطیلی
    setSubmitting(true);
    try {
      const data = await api("POST", "/api/orders", {
        addressId,
        shippingMethod,
        note: note.trim() || null,
        items: items.map((i) => ({ productId: i.id, quantity: i.qty })),
      });
      setOrder(data.order);
      setWalletBalance(data.walletBalance ?? 0);
      clearCart();
    } catch (err) {
      if (err.status === 401) return router.push(LOGIN_URL);
      // وسط ثبت سفارش ادمین فروشگاه رو بسته → به‌جای toast، مودال تعطیلی
      if (err.data?.code === "STORE_CLOSED") return showClosed(err.message);
      notify.error(err.message);
      // قیمت یا موجودی عوض شده — سبد رو به‌روز کن تا کاربر تغییرات رو ببینه
      if (err.status === 409) syncCart().then(showNotices).catch(() => {});
    } finally {
      setSubmitting(false);
    }
  }

  if (order) return <OrderSuccess initialOrder={order} initialBalance={walletBalance} />;

  // هنوز از localStorage نخوندیم → اسکلتون (تا «سبد خالی» یک لحظه چشمک نزنه)
  if (!ready) {
    return (
      <div className="space-y-3">
        {[0, 1].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl bg-slate-100" />
        ))}
      </div>
    );
  }

  if (lines === 0) {
    return (
      <div className="mx-auto flex max-w-sm flex-col items-center gap-3 py-16 text-center">
        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <FaShoppingBasket size={34} />
        </span>
        <h1 className="text-base font-extrabold text-slate-800">سبد خرید شما خالی است</h1>
        <p className="text-xs leading-6 text-slate-500">از بین هزاران کالای سوپرمارکت، هر چه لازم دارید انتخاب کنید.</p>
        <Link href="/products" className={cn(buttonVariants({ size: "default" }), "mt-2")}>
          مشاهده محصولات
        </Link>
      </div>
    );
  }

  const ctaLabel = !user ? "ورود / ثبت‌نام و ادامه" : submitting ? "در حال ثبت سفارش..." : "ثبت سفارش";
  const ctaDisabled = authLoading || submitting || quoteLoading || (!!user && addresses !== null && addresses.length === 0);

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-extrabold text-slate-800">سبد خرید</h1>
          <p className="text-xs text-slate-500">{formatNumber(count)} کالا</p>
        </div>
        <button
          type="button"
          onClick={async () => {
            if (await confirm({ title: "حذف همه‌ی کالاها", description: "همه‌ی کالاهای سبد خرید حذف شود؟", confirmText: "حذف همه" })) {
              clearCart();
              notify.info("سبد خرید خالی شد.");
            }
          }}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-rose-600"
        >
          <FaRegTrashAlt size={12} /> حذف همه
        </button>
      </div>

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <ul className="min-w-0 flex-1 space-y-3">
          {items.map((item) => (
            <CartItemRow key={item.id} item={item} />
          ))}
        </ul>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:w-96 lg:shrink-0">
          {user && (
            <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <h2 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-slate-800">
                <FaMapMarkerAlt className="text-green-700" size={14} /> آدرس تحویل
              </h2>
              <AddressPicker addresses={addresses} selectedId={addressId} onSelect={setAddressId} />
              <label className="mt-3 block text-xs text-slate-500">
                توضیحات سفارش (اختیاری)
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={300}
                  rows={2}
                  placeholder="مثلاً: لطفاً قبل از رسیدن تماس بگیرید"
                  className="mt-1 w-full resize-none rounded-xl border border-slate-200 p-2.5 text-sm text-slate-800 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-600/20"
                />
              </label>
            </section>
          )}

          {user && (
            <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <h2 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-slate-800">
                <FaTruck className="text-green-700" size={14} /> روش ارسال
              </h2>
              <ShippingPicker quote={quote} loading={quoteLoading} selected={shippingMethod} onSelect={setShippingMethod} address={selectedAddress} />
            </section>
          )}

          <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between text-slate-600">
                <dt>قیمت کالاها ({formatNumber(count)})</dt>
                <dd>{formatToman(itemsTotal)}</dd>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-rose-600">
                  <dt>سود شما از خرید</dt>
                  <dd>{formatToman(discount)}</dd>
                </div>
              )}
              {shippingOption && (
                <div className="flex justify-between text-slate-600">
                  <dt>هزینه‌ی ارسال</dt>
                  <dd className={shippingFee === 0 ? "font-bold text-green-700" : ""}>{shippingFee === 0 ? "رایگان" : formatToman(shippingFee)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-slate-100 pt-3 text-base font-extrabold text-slate-800">
                <dt>مبلغ قابل پرداخت</dt>
                <dd>{formatToman(grandTotal)}</dd>
              </div>
            </dl>


            <button
              type="button"
              onClick={handleCheckout}
              disabled={ctaDisabled}
              className={cn(buttonVariants({ size: "lg" }), "mt-4 hidden w-full md:flex")}
            >
              {ctaLabel}
            </button>
          </section>

          <Link href="/products" className="flex items-center justify-center gap-1 text-xs font-medium text-green-700 hover:underline">
            <FaChevronRight size={10} /> ادامه خرید
          </Link>
        </aside>
      </div>

      {/* نوار ثابت پایین در موبایل (منوی پایین توی صفحه‌ی سبد نیست تا این نوار جاش رو بگیره) */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgba(0,0,0,0.06)] md:hidden">
        <div>
          <p className="text-xs text-slate-500">مبلغ قابل پرداخت</p>
          <p className="text-base font-extrabold text-slate-800">{formatToman(grandTotal)}</p>
        </div>
        <button
          type="button"
          onClick={handleCheckout}
          disabled={ctaDisabled}
          className={cn(buttonVariants({ size: "default" }), "")}
        >
          {ctaLabel}
        </button>
      </div>
    </>
  );
}
