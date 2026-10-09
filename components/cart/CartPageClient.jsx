"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useRef, useState } from "react";
import {
  FaCheck,
  FaChevronRight,
  FaCreditCard,
  FaMapMarkerAlt,
  FaMotorcycle,
  FaRegTrashAlt,
  FaShoppingBasket,
  FaStore,
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
import AddToCartButton from "./AddToCartButton";
import { useCart } from "./useCart";
import { notify } from "@/lib/toast";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { useStoreStatus } from "@/components/providers/StoreStatusProvider";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

const LOGIN_URL = `/auth/login?next=${encodeURIComponent("/cart")}`;

// ───────────── مراحل ثبت سفارش ─────────────
// ۱) سبد خرید  ۲) آدرس و نحوه‌ی ارسال  ۳) پرداخت
const STEPS = [
  { key: 1, title: "سبد خرید", short: "سبد خرید", Icon: FaShoppingBasket },
  { key: 2, title: "آدرس و نحوه ارسال", short: "ارسال", Icon: FaTruck },
  { key: 3, title: "پرداخت", short: "پرداخت", Icon: FaCreditCard },
];

// شیوه‌های پرداخت. فعلاً فقط یک درگاه بانکی داریم؛ بعداً که درگاه واقعی وصل شد (lib/gateway.js)
// اگه خواستی روش جدیدی اضافه کنی فقط یه آیتم به این لیست اضافه کن.
const PAYMENT_METHODS = [
  { value: "GATEWAY", label: "درگاه بانکی", description: "پرداخت آنلاین با تمامی کارت‌های بانکی", Icon: FaCreditCard },
];

// ───────────── نوار مراحل (بالای صفحه) ─────────────

function Stepper({ step }) {
  return (
    <ol className="mb-5 flex items-start px-2" aria-label="مراحل ثبت سفارش">
      {STEPS.map((s, i) => {
        const done = step > s.key;
        const active = step === s.key;
        const Icon = s.Icon;
        return (
          <Fragment key={s.key}>
            <li aria-current={active ? "step" : undefined} className="flex w-14 shrink-0 flex-col items-center gap-1">
              <span
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full transition",
                  done || active ? "bg-green-600 text-white shadow-brand" : "bg-slate-100 text-slate-400",
                )}
              >
                {done ? <FaCheck size={13} /> : <Icon size={14} />}
              </span>
              <span className={cn("text-[11px] font-medium", active ? "text-green-700" : "text-slate-400")}>{s.short}</span>
            </li>
            {/* خطِ بین دو مرحله؛ اگه مرحله‌ی قبلی تموم شده باشه رنگی می‌شه */}
            {i < STEPS.length - 1 && (
              <span aria-hidden className={cn("mt-[17px] h-0.5 flex-1 rounded-full transition", done ? "bg-green-600" : "bg-slate-200")} />
            )}
          </Fragment>
        );
      })}
    </ol>
  );
}

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

// ───────────── انتخاب شیوه‌ی پرداخت ─────────────

function PaymentPicker({ selected, onSelect }) {
  return (
    <div role="radiogroup" aria-label="شیوه پرداخت" className="space-y-2">
      {PAYMENT_METHODS.map((m) => {
        const checked = m.value === selected;
        const Icon = m.Icon;
        return (
          <label
            key={m.value}
            className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-xs transition ${
              checked ? "border-green-600 bg-green-50/60 ring-1 ring-green-600/30" : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <input type="radio" name="payment" checked={checked} onChange={() => onSelect(m.value)} className="accent-green-700" />
            <span className="min-w-0 flex-1 leading-6">
              <span className="block font-bold text-slate-800">{m.label}</span>
              <span className="block text-slate-500">{m.description}</span>
            </span>
            <Icon className="shrink-0 text-green-700" size={20} />
          </label>
        );
      })}
    </div>
  );
}

// ───────────── کارت خلاصه‌ی صورت‌حساب ─────────────

/** totals: { count, itemsTotal, discount, shippingFee, hasShipping, grandTotal } */
function SummaryCard({ title, totalLabel, totals, cta }) {
  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-bold text-slate-800">{title}</h2>
      <dl className="space-y-3 text-sm">
        <div className="flex justify-between text-slate-600">
          <dt>قیمت کالاها ({formatNumber(totals.count)})</dt>
          <dd>{formatToman(totals.itemsTotal)}</dd>
        </div>
        {totals.discount > 0 && (
          <div className="flex justify-between text-rose-600">
            <dt>سود شما از خرید</dt>
            <dd>{formatToman(totals.discount)}</dd>
          </div>
        )}
        {totals.hasShipping && (
          <div className="flex justify-between text-slate-600">
            <dt>هزینه‌ی ارسال</dt>
            <dd className={totals.shippingFee === 0 ? "font-bold text-green-700" : ""}>
              {totals.shippingFee === 0 ? "رایگان" : formatToman(totals.shippingFee)}
            </dd>
          </div>
        )}
        <div className="flex justify-between border-t border-slate-100 pt-3 text-base font-extrabold text-slate-800">
          <dt>{totalLabel}</dt>
          <dd>{formatToman(totals.grandTotal)}</dd>
        </div>
      </dl>

      {/* دکمه‌ی دسکتاپ؛ توی موبایل نوار ثابت پایین صفحه جاش رو می‌گیره */}
      <button
        type="button"
        onClick={cta.onClick}
        disabled={cta.disabled}
        className={cn(buttonVariants({ size: "lg" }), "mt-4 hidden w-full md:flex")}
      >
        {cta.label}
      </button>
    </section>
  );
}

// ───────────── صفحه ─────────────

export default function CartPageClient() {
  const router = useRouter();
  const confirm = useConfirm();
  const { guard, showClosed } = useStoreStatus();
  const { user, loading: authLoading } = useAuth();
  const { items, ready, count, lines, itemsTotal, payable, discount } = useCart();

  const [step, setStep] = useState(1); // مرحله‌ی فعلی: ۱ سبد، ۲ آدرس و ارسال، ۳ پرداخت
  const [addresses, setAddresses] = useState(null);
  const [addressId, setAddressId] = useState(null);
  const [shippingMethod, setShippingMethod] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0].value);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // سفارشِ ساخته‌شده. بعد از ساخته‌شدن، اگه شروع پرداخت خطا بده با «تلاش دوباره» سفارش تکراری ساخته نمی‌شه
  const [order, setOrder] = useState(null);
  const synced = useRef(false);

  // هر تغییر قیمت/موجودی که موقع هماهنگی سبد پیدا شد، یک toast هشدار می‌شه
  function showNotices(list) {
    (list ?? []).forEach((n) => notify.warning(n, { autoClose: 8000 }));
  }

  function goToStep(n) {
    setStep(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
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
  // نتیجه با کلیدِ (استان، شهر، سبد) ذخیره می‌شه؛ تا رسیدن جواب جدید، جواب قبلی نمایش داده می‌شه ولی دکمه‌ی ادامه غیرفعاله.
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

  // جمع‌ها: قبل از ثبت سفارش از سبد حساب می‌شه، بعدش از خودِ سفارش (چون سبد خالی شده)
  const totals = order
    ? {
        count: order.items.reduce((s, i) => s + i.quantity, 0),
        itemsTotal: order.itemsTotal,
        discount: order.discountTotal,
        shippingFee: order.shippingFee,
        hasShipping: true,
        grandTotal: order.payable,
      }
    : {
        count,
        itemsTotal,
        discount,
        shippingFee,
        hasShipping: Boolean(shippingOption),
        grandTotal: payable + shippingFee,
      };

  // ───── مرحله‌ی ۱ ← ۲ ─────
  function handleToAddress() {
    if (!user) return router.push(LOGIN_URL);
    goToStep(2);
  }

  // ───── اعتبارسنجی آدرس و روش ارسال (هم برای رفتن به مرحله‌ی ۳، هم قبل از ثبت سفارش) ─────
  function validateDelivery() {
    if (!selectedAddress) {
      notify.error("آدرس تحویل را انتخاب کنید");
      return false;
    }
    if (!isAddressComplete(selectedAddress)) {
      notify.error("آدرس انتخاب‌شده کامل نیست. آدرس را (همراه با کد پستی) تکمیل کنید.");
      return false;
    }
    if (!shippingMethod) {
      notify.error("روش ارسال را انتخاب کنید");
      return false;
    }
    return true;
  }

  // ───── مرحله‌ی ۲ ← ۳ ─────
  function handleToPayment() {
    if (!user) return router.push(LOGIN_URL);
    if (!validateDelivery()) return;
    goToStep(3);
  }

  // ───── مرحله‌ی ۳: ساخت سفارش + رفتن به درگاه ─────
  async function handlePay() {
    if (!user) return router.push(LOGIN_URL);
    if (!order && !validateDelivery()) return;
    if (!(await guard())) return; // فروشگاه بسته است → مودال تعطیلی

    setSubmitting(true);
    let redirecting = false;
    try {
      let current = order;
      if (!current) {
        const data = await api("POST", "/api/orders", {
          addressId,
          shippingMethod,
          note: note.trim() || null,
          items: items.map((i) => ({ productId: i.id, quantity: i.qty })),
        });
        current = data.order;
        setOrder(current);
        clearCart(); // سفارش ثبت شد؛ سبد خالی می‌شه (موجودی کالاها هم همین‌جا رزرو شده)
      }

      // پرداخت فقط از درگاه (کیف پول توی این مرحله استفاده نمی‌شه)
      const pay = await api("POST", `/api/orders/${current.code}/pay`, { useWallet: false });
      if (pay.redirectUrl) {
        redirecting = true; // تا رفتن به درگاه دکمه غیرفعال می‌مونه
        window.location.assign(pay.redirectUrl);
        return;
      }
      // (حالت غیرمنتظره) سفارش بدون رفتن به درگاه تسویه شد
      router.push("/profile?tab=orders");
    } catch (err) {
      if (err.status === 401) return router.push(LOGIN_URL);
      // وسط ثبت سفارش ادمین فروشگاه رو بسته → به‌جای toast، مودال تعطیلی
      if (err.data?.code === "STORE_CLOSED") return showClosed(err.message);
      notify.error(err.message);
      // قیمت یا موجودی عوض شده — سبد رو به‌روز کن و کاربر رو به مرحله‌ی سبد برگردون تا تغییرات رو ببینه
      if (err.status === 409 && !order) {
        syncCart().then(showNotices).catch(() => {});
        goToStep(1);
      }
    } finally {
      if (!redirecting) setSubmitting(false);
    }
  }

  // ───── حالت‌های خاص صفحه ─────

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

  // سبد خالیه (ولی اگه سفارش ساخته شده و منتظر پرداخته، مرحله‌ی ۳ نشون داده می‌شه)
  if (lines === 0 && !order) {
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

  // ───── دکمه‌ی اصلی هر مرحله ─────
  const cta =
    step === 1
      ? { label: !user ? "ورود / ثبت‌نام و ادامه" : "ادامه فرآیند خرید", onClick: handleToAddress, disabled: authLoading }
      : step === 2
        ? {
            label: "ادامه فرآیند خرید",
            onClick: handleToPayment,
            disabled: authLoading || quoteLoading || (addresses !== null && addresses.length === 0),
          }
        : { label: submitting ? "در حال انتقال به درگاه..." : "پرداخت", onClick: handlePay, disabled: submitting };

  const currentStep = STEPS[step - 1];
  const canGoBack = step > 1 && !order; // بعد از ثبت سفارش دیگه نمی‌شه به مراحل قبل برگشت
  const summaryTitle = step === 3 ? "اطلاعات پرداخت" : "خلاصه صورت حساب";
  const totalLabel = step === 1 ? "جمع سبد خرید" : "مبلغ قابل پرداخت";

  return (
    <div className="pb-28 md:pb-0">
      {/* سربرگ: عنوان مرحله (+ دکمه‌ی برگشت در مراحل ۲ و ۳) */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {canGoBack && (
            <button
              type="button"
              onClick={() => goToStep(step - 1)}
              aria-label="مرحله‌ی قبل"
              className="-ms-2 rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            >
              <FaChevronRight size={14} />
            </button>
          )}
          <div>
            <h1 className="text-lg font-extrabold text-slate-800">{currentStep.title}</h1>
            {step === 1 && <p className="text-xs text-slate-500">{formatNumber(count)} کالا</p>}
          </div>
        </div>

        {step === 1 && (
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
        )}
      </div>

      <Stepper step={step} />

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        {/* ستون اصلی: محتوای هر مرحله */}
        <div className="min-w-0 flex-1 space-y-4">
          {/* مرحله‌ی ۱: کالاهای سبد */}
          {step === 1 && (
            <ul className="space-y-3">
              {items.map((item) => (
                <CartItemRow key={item.id} item={item} />
              ))}
            </ul>
          )}

          {/* مرحله‌ی ۲: آدرس + روش ارسال */}
          {step === 2 && (
            <>
              <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <h2 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-slate-800">
                  <FaMapMarkerAlt className="text-green-700" size={14} /> آدرس دریافت سفارش
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

              <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <h2 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-slate-800">
                  <FaTruck className="text-green-700" size={14} /> نحوه ارسال سفارش
                </h2>
                <ShippingPicker
                  quote={quote}
                  loading={quoteLoading}
                  selected={shippingMethod}
                  onSelect={setShippingMethod}
                  address={selectedAddress}
                />
              </section>
            </>
          )}

          {/* مرحله‌ی ۳: شیوه‌ی پرداخت */}
          {step === 3 && (
            <>
              {order && (
                <p className="rounded-2xl bg-green-50 p-3 text-xs leading-6 text-green-800">
                  سفارش شما با کد پیگیری <span className="font-bold">{toFaDigits(order.code)}</span> ثبت شده و تا زمان پرداخت در انتظار می‌ماند.
                  اگه پرداخت انجام نشد، بعداً هم می‌توانید از بخش{" "}
                  <Link href="/profile?tab=orders" className="font-bold underline">
                    سفارش‌ها
                  </Link>{" "}
                  در حساب کاربری پرداخت کنید.
                </p>
              )}
              <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <h2 className="mb-3 text-sm font-bold text-slate-800">شیوه پرداخت</h2>
                <PaymentPicker selected={paymentMethod} onSelect={setPaymentMethod} />
              </section>
            </>
          )}

          <Link href="/products" className="flex items-center justify-center gap-1 pt-1 text-xs font-medium text-green-700 hover:underline lg:hidden">
            <FaChevronRight size={10} /> ادامه خرید
          </Link>
        </div>

        {/* کنار صفحه (دسکتاپ) / زیر محتوا (موبایل): خلاصه‌ی صورت‌حساب */}
        <aside className="space-y-4 lg:sticky lg:top-24 lg:w-96 lg:shrink-0">
          <SummaryCard title={summaryTitle} totalLabel={totalLabel} totals={totals} cta={cta} />
          <Link href="/products" className="hidden items-center justify-center gap-1 text-xs font-medium text-green-700 hover:underline lg:flex">
            <FaChevronRight size={10} /> ادامه خرید
          </Link>
        </aside>
      </div>

      {/* نوار ثابت پایین در موبایل (منوی پایین توی صفحه‌ی سبد نیست تا این نوار جاش رو بگیره) */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgba(0,0,0,0.06)] md:hidden">
        {/* توی مرحله‌ی پرداخت مثل طراحی، فقط دکمه‌ی تمام‌عرض داریم */}
        {step < 3 && (
          <div>
            <p className="text-xs text-slate-500">{totalLabel}</p>
            <p className="text-base font-extrabold text-slate-800">{formatToman(totals.grandTotal)}</p>
          </div>
        )}
        <button
          type="button"
          onClick={cta.onClick}
          disabled={cta.disabled}
          className={cn(buttonVariants({ size: step === 3 ? "lg" : "default" }), step === 3 && "w-full")}
        >
          {cta.label}
        </button>
      </div>
    </div>
  );
}
