"use client";

import { useState } from "react";
import { Select } from "@/components/ui/select";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FaCheckCircle, FaFileInvoice } from "react-icons/fa";
import { Spinner, btnPrimary, inputCls } from "@/components/ui/form";
import { Card, OrderStatusBadge, PageHeader } from "@/components/admin/ui";
import CancelOrderDialog from "@/components/orders/CancelOrderDialog";
import {
  ORDER_STATUS_OPTIONS,
  PAYMENT_METHOD_LABELS,
  TRANSACTION_STATUS_META,
  TRANSACTION_TYPE_META,
} from "@/lib/admin-constants";
import { ADMIN_CANCEL_REASONS, AUTO_DELIVER_AFTER_HOURS, postTrackingUrl } from "@/lib/order-constants";
import { api } from "@/lib/api-client";
import { formatNumber, formatToman } from "@/lib/format";
import { formatJalaliDateTime } from "@/lib/jalali";
import { toFaDigits } from "@/lib/phone";
import { SHIPPING_LABELS, deliveryMessage } from "@/lib/shipping";
import { notify, useToastOnChange } from "@/lib/toast";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function OrderDetail({ order, buyer, couriers = [], money, transactions = [], buyerWallet = 0 }) {
  const router = useRouter();
  const [status, setStatus] = useState(order.status);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useToastOnChange(error); // پیام خطا به‌صورت toast نشون داده می‌شه
  const a = order.address;

  const [cancelOpen, setCancelOpen] = useState(false);
  const [courierId, setCourierId] = useState(order.courierId ?? "");
  const [courierBusy, setCourierBusy] = useState(false);
  const [trackingCode, setTrackingCode] = useState(order.trackingCode ?? "");
  const [savedTracking, setSavedTracking] = useState(order.trackingCode ?? "");
  const [trackingBusy, setTrackingBusy] = useState(false);

  async function saveTracking() {
    setTrackingBusy(true);
    setError("");
    try {
      const data = await api("PATCH", `/api/admin/orders/${order.code}/tracking`, { trackingCode });
      setSavedTracking(data.trackingCode ?? "");
      setTrackingCode(data.trackingCode ?? "");
      notify.success(data.trackingCode ? "کد رهگیری ثبت شد." : "کد رهگیری پاک شد.");
    } catch (err) {
      setError(err.message);
    } finally {
      setTrackingBusy(false);
    }
  }

  async function handleCourierChange(next) {
    if (next === courierId) return;
    setCourierBusy(true);
    setError("");
    try {
      await api("PATCH", `/api/admin/orders/${order.code}/courier`, { courierId: next || null });
      notify.success("پیک سفارش تغییر کرد.");
      setCourierId(next);
    } catch (err) {
      setError(err.message);
    } finally {
      setCourierBusy(false);
    }
  }

  const isDead = status === "CANCELED" || status === "RETURNED";
  // دکمه‌ی «قدم بعدی» بالای کارت وضعیت: بدون باز کردن لیست، سفارش رو یک قدم جلو می‌بره
  const autoHours = AUTO_DELIVER_AFTER_HOURS[order.shippingMethod];
  const autoDeliverText = autoHours
    ? `${formatNumber(autoHours >= 24 ? Math.round(autoHours / 24) : autoHours)} ${autoHours >= 24 ? "روز" : "ساعت"} بعد از ارسال`
    : "برای این روش ارسال غیرفعال است";
  const nextStep = {
    PENDING: { value: "PROCESSING", label: "شروع آماده‌سازی" },
    PROCESSING: { value: "SHIPPING", label: order.shippingMethod === "PICKUP" ? "آماده‌ی تحویل حضوری (ارسال)" : "ارسال شد" },
    SHIPPING: { value: "DELIVERED", label: "تحویل شد" },
  }[status];
  const remaining = isDead ? 0 : Math.max(0, order.payable - money.paidSuccess);
  const paymentLabel =
    money.paidSuccess === 0
      ? "پرداخت‌نشده"
      : isDead
        ? money.refundActive >= money.paidSuccess
          ? "کل مبلغ برگشت خورده"
          : "نیازمند برگشت وجه"
        : remaining === 0
          ? "پرداخت کامل"
          : "پرداخت ناقص";

  async function handleStatusChange(next, cancelReason) {
    if (next === status) return;
    // لغو فقط با دلیل: دیالوگ دلیل باز می‌شه و بعد از تأیید همین تابع با cancelReason صدا زده می‌شه
    if (next === "CANCELED" && !cancelReason) {
      setCancelOpen(true);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const data = await api("PATCH", `/api/admin/orders/${order.code}`, { status: next, cancelReason });
      notify.success(
        data.refunded > 0
          ? `سفارش لغو شد و ${formatToman(data.refunded)} به کیف پول مشتری برگشت.`
          : next === "CANCELED"
            ? "سفارش لغو شد."
            : "وضعیت سفارش به‌روز شد.",
      );
      setStatus(next);
      router.refresh();
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader title={`سفارش ${toFaDigits(order.code)}`} description={formatJalaliDateTime(order.createdAt)}>
        <a
          href={`/admin/print/invoices?codes=${order.code}`}
          target="_blank"
          rel="noopener"
          className={cn(buttonVariants({ size: "sm" }), "flex")}
        >
          <FaFileInvoice size={12} /> مشاهده و چاپ فاکتور
        </a>
        <OrderStatusBadge status={status} />
      </PageHeader>


      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-1">
          <Card title="وضعیت سفارش">
            {nextStep && (
              <button
                type="button"
                disabled={busy}
                onClick={() => handleStatusChange(nextStep.value).catch(() => {})}
                className={cn(buttonVariants({ size: "default" }), "mb-3 flex w-full")}
              >
                <FaCheckCircle size={13} /> {nextStep.label}
              </button>
            )}
            <div className="flex items-center gap-2">
              <Select
                value={status}
                onChange={(e) => handleStatusChange(e.target.value).catch(() => {})}
                disabled={busy || status === "CANCELED"}
                className={inputCls()}
              >
                {ORDER_STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
              {busy && <Spinner />}
            </div>
            {status === "CANCELED" ? (
              <div className="mt-3 rounded-xl bg-red-50 p-3 text-xs leading-6 text-red-700">
                <p>
                  <span className="font-bold">دلیل لغو: </span>
                  {order.cancelReason || "—"}
                </p>
                <p className="text-xs text-red-500">
                  {order.canceledBy === "USER" ? "لغو توسط مشتری" : order.canceledBy === "ADMIN" ? "لغو توسط مدیر" : ""}
                  {order.canceledAt ? ` — ${formatJalaliDateTime(order.canceledAt)}` : ""}
                </p>
                <p className="mt-1 text-xs text-slate-500">سفارش لغوشده دوباره فعال نمی‌شود.</p>
              </div>
            ) : (
              <p className="mt-2 text-xs leading-5 text-slate-400">
                «لغو شده»: دلیل لازم است؛ کالاها به انبار و مبلغ پرداخت‌شده به کیف پول مشتری برمی‌گردد (غیرقابل بازگشت).
              </p>
            )}
          </Card>

          <CancelOrderDialog
            open={cancelOpen}
            onOpenChange={setCancelOpen}
            reasons={ADMIN_CANCEL_REASONS}
            title={`لغو سفارش ${toFaDigits(order.code)}`}
            description={
              money.paidSuccess > money.refundActive
                ? `مبلغ پرداخت‌شده (${formatToman(money.paidSuccess - money.refundActive)}) به کیف پول مشتری برگردانده می‌شود. این کار قابل بازگشت نیست.`
                : "کالاها به انبار برمی‌گردند. این کار قابل بازگشت نیست."
            }
            onSubmit={(reason) => handleStatusChange("CANCELED", reason)}
          />

          <Card title="پیک">
            <div className="flex items-center gap-2">
              <Select
                value={courierId}
                onChange={(e) => handleCourierChange(e.target.value)}
                disabled={courierBusy}
                className={inputCls()}
              >
                <option value="">بدون پیک</option>
                {couriers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.isActive ? "" : " (غیرفعال)"}
                  </option>
                ))}
              </Select>
              {courierBusy && <Spinner />}
            </div>
            {couriers.length === 0 && (
              <p className="mt-2 text-xs text-slate-400">
                هنوز پیکی ثبت نشده. از{" "}
                <Link href="/admin/shipping/couriers" className="text-green-700 hover:underline">
                  بخش پیک‌ها
                </Link>{" "}
                اضافه کنید.
              </p>
            )}
          </Card>

          {order.shippingMethod !== "PICKUP" && (
            <Card title={order.shippingMethod === "POST" ? "کد رهگیری پست" : "کد رهگیری (اختیاری)"}>
              <div className="flex items-center gap-2">
                <input
                  value={trackingCode}
                  onChange={(e) => setTrackingCode(e.target.value)}
                  dir="ltr"
                  inputMode="text"
                  maxLength={40}
                  placeholder="مثلاً 240123456789012345"
                  aria-label="کد رهگیری"
                  className={inputCls()}
                />
                <button
                  type="button"
                  onClick={saveTracking}
                  disabled={trackingBusy || trackingCode.trim() === savedTracking}
                  className="h-11 shrink-0 rounded-xl bg-slate-800 px-4 text-xs font-bold text-white transition hover:bg-slate-900 disabled:opacity-40"
                >
                  {trackingBusy ? <Spinner /> : "ذخیره"}
                </button>
              </div>
              {order.shippingMethod === "POST" && status === "SHIPPING" && !savedTracking && (
                <p className="mt-2 text-xs text-amber-600">سفارش با پست ارسال شده ولی هنوز کد رهگیری ندارد؛ مشتری کد را در پنل خودش می‌بیند.</p>
              )}
              {savedTracking && (
                <a href={postTrackingUrl(savedTracking)} target="_blank" rel="noopener" className="mt-2 inline-block text-xs text-green-700 hover:underline">
                  رهگیری در سایت پست ↗
                </a>
              )}
            </Card>
          )}

          <Card title="زمان‌بندی">
            <dl className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <dt className="text-slate-500">ثبت سفارش</dt>
                <dd className="text-slate-700">{formatJalaliDateTime(order.createdAt)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">ارسال</dt>
                <dd className="text-slate-700">{order.shippedAt ? formatJalaliDateTime(order.shippedAt) : "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">تحویل</dt>
                <dd className="text-slate-700">{order.deliveredAt ? formatJalaliDateTime(order.deliveredAt) : "—"}</dd>
              </div>
            </dl>
            <p className="mt-2 text-xs leading-5 text-slate-400">
              تحویل با دکمه‌ی «تحویل شد»، تأیید مشتری در پنلش، یا تأیید خودکار ({autoDeliverText}) ثبت می‌شود.
            </p>
          </Card>

          <Card title="پرداخت">
            <dl className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <dt className="text-slate-500">وضعیت</dt>
                <dd className="font-bold text-slate-800">{paymentLabel}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">پرداخت‌شده</dt>
                <dd className="text-slate-700">{formatToman(money.paidSuccess)}</dd>
              </div>
              {money.refundActive > 0 && (
                <div className="flex justify-between">
                  <dt className="text-slate-500">برگشت وجه</dt>
                  <dd className="text-orange-700">{formatToman(money.refundActive)}</dd>
                </div>
              )}
              {remaining > 0 && (
                <div className="flex justify-between">
                  <dt className="text-slate-500">مانده</dt>
                  <dd className="text-slate-700">{formatToman(remaining)}</dd>
                </div>
              )}
            </dl>
            {transactions.length > 0 && (
              <ul className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 text-xs">
                {transactions.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-2">
                    <span className="text-slate-600">
                      {TRANSACTION_TYPE_META[t.type]?.label} — {PAYMENT_METHOD_LABELS[t.method] ?? t.method}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className={t.type === "REFUND" ? "text-orange-700" : "text-slate-800"}>
                        {t.type === "REFUND" ? "−" : ""}
                        {formatToman(t.amount)}
                      </span>
                      <span className={`rounded-full px-1.5 py-0.5 font-bold ${TRANSACTION_STATUS_META[t.status]?.color ?? ""}`}>
                        {TRANSACTION_STATUS_META[t.status]?.label}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3 flex flex-wrap gap-3 border-t border-slate-100 pt-3 text-xs">
              <Link href={`/admin/finance/payments?order=${order.code}`} className="text-green-700 hover:underline">
                ثبت پرداخت
              </Link>
              <Link href={`/admin/finance/transactions?q=${order.code}`} className="text-slate-500 hover:text-green-700">
                تراکنش‌ها
              </Link>
              {money.paidSuccess > money.refundActive && (
                <Link href={`/admin/finance/refunds?order=${order.code}`} className="text-slate-500 hover:text-orange-700">
                  برگشت وجه
                </Link>
              )}
            </div>
          </Card>

          <Card title="خریدار">
            <p className="text-xs">
              <Link href={`/admin/users/${buyer.id}`} className="font-medium text-slate-800 hover:text-green-700">
                {buyer.name}
              </Link>
            </p>
            <p className="mt-1 text-xs text-slate-500">
              <span dir="ltr" className="inline-block">
                {buyer.phone}
              </span>
            </p>
            <p className="mt-2 text-xs text-slate-500">
              موجودی کیف پول: <span className="font-bold text-slate-700">{formatToman(buyerWallet)}</span>
            </p>
          </Card>

          <Card title="تحویل">
            <dl className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <dt className="text-slate-500">روش ارسال</dt>
                <dd className="text-slate-700">{SHIPPING_LABELS[order.shippingMethod] ?? "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">زمان تحویل</dt>
                <dd className="text-slate-700">{deliveryMessage(order.shippingMethod, a.city, order.deliveryTime)}</dd>
              </div>
            </dl>
            <p className="mt-3 border-t border-slate-100 pt-3 text-xs leading-6 text-slate-600">
              {a.recipientName} — {toFaDigits(a.recipientPhone)}
              <br />
              {a.province}، {a.city}
              {a.neighborhood ? `، ${a.neighborhood}` : ""}، {a.addressLine}
              {a.plaque ? `، پلاک ${toFaDigits(a.plaque)}` : ""}
              {a.unit ? `، واحد ${toFaDigits(a.unit)}` : ""}
              <br />
              کد پستی: {toFaDigits(a.postalCode)}
            </p>
            {order.note && (
              <p className="mt-3 border-t border-slate-100 pt-3 text-xs leading-6 text-slate-600">
                <span className="font-bold text-slate-700">یادداشت: </span>
                {order.note}
              </p>
            )}
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card title="اقلام سفارش">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-start text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2 pe-3 font-medium">کالا</th>
                    <th className="py-2 pe-3 font-medium">واحد</th>
                    <th className="py-2 pe-3 font-medium">تعداد</th>
                    <th className="py-2 pe-3 font-medium">قیمت واحد</th>
                    <th className="py-2 pe-3 font-medium">جمع</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((it) => (
                    <tr key={it.id} className="border-b border-slate-100">
                      <td className="py-2.5 pe-3 text-slate-800">{it.name}</td>
                      <td className="py-2.5 pe-3 text-slate-600">{it.unitLabel}</td>
                      <td className="py-2.5 pe-3 text-slate-600">{formatNumber(it.quantity)}</td>
                      <td className="py-2.5 pe-3 text-slate-600">{formatToman(it.finalPrice)}</td>
                      <td className="py-2.5 pe-3 font-medium text-slate-800">
                        {formatToman(it.finalPrice * it.quantity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <dl className="mt-4 space-y-1.5 border-t border-slate-100 pt-3 text-xs">
              <div className="flex justify-between">
                <dt className="text-slate-500">جمع کالاها</dt>
                <dd className="text-slate-700">{formatToman(order.itemsTotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">تخفیف</dt>
                <dd className="text-slate-700">{formatToman(order.discountTotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">هزینه‌ی ارسال</dt>
                <dd className="text-slate-700">{order.shippingFee > 0 ? formatToman(order.shippingFee) : "رایگان"}</dd>
              </div>
              <div className="flex justify-between text-sm font-extrabold text-slate-800">
                <dt>مبلغ قابل پرداخت</dt>
                <dd>{formatToman(order.payable)}</dd>
              </div>
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}
