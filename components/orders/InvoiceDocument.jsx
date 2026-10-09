// بدنه‌ی فاکتور (سرور کامپوننت) — هم برای مشتری، هم چاپ ادمین (تکی و گروهی) استفاده می‌شه.
import { PAYMENT_STATUS_META } from "@/lib/order-constants";
import { formatNumber, formatToman } from "@/lib/format";
import { formatJalaliDateTime } from "@/lib/jalali";
import { toFaDigits } from "@/lib/phone";
import { SHIPPING_LABELS, deliveryMessage } from "@/lib/shipping";
import { STORE_INFO } from "@/lib/store-info";

const STATUS_LABELS = {
  PENDING: "در انتظار بررسی",
  PROCESSING: "در حال آماده‌سازی",
  SHIPPING: "در حال ارسال",
  DELIVERED: "تحویل شده",
  RETURNED: "مرجوع شده",
  CANCELED: "لغو شده",
};

function InfoLine({ label, children }) {
  return (
    <p className="leading-7">
      <span className="text-slate-500">{label}: </span>
      <span className="font-medium text-slate-900">{children}</span>
    </p>
  );
}

/**
 * order: خروجی toPublicOrder — buyer: { name, phone, nationalCode? } — payment: خروجی publicPayment
 * breakAfter: بعد از این فاکتور صفحه‌ی جدید شروع بشه (برای چاپ گروهی)
 */
export default function InvoiceDocument({ order, buyer, payment, breakAfter = false }) {
  const a = order.address;
  return (
      <article className={`mx-auto max-w-[210mm] ${breakAfter ? "print:break-after-page" : ""} rounded-2xl bg-white p-6 text-sm shadow-sm ring-1 ring-slate-200 sm:p-10 print:max-w-none print:rounded-none print:p-0 print:shadow-none print:ring-0`}>
        {/* سربرگ */}
        <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-slate-800 pb-4">
          <div>
            <h1 className="text-xl font-extrabold">فاکتور فروش</h1>
            <p className="mt-1 text-base font-bold text-green-800">{STORE_INFO.name}</p>
          </div>
          <div className="text-xs leading-7">
            <InfoLine label="شماره فاکتور">{toFaDigits(order.code)}</InfoLine>
            <InfoLine label="تاریخ ثبت">{formatJalaliDateTime(order.createdAt)}</InfoLine>
            <InfoLine label="وضعیت سفارش">{STATUS_LABELS[order.status]}</InfoLine>
            {order.status !== "CANCELED" && order.status !== "RETURNED" && (
              <InfoLine label="وضعیت پرداخت">{PAYMENT_STATUS_META[payment.status].label}</InfoLine>
            )}
          </div>
        </header>

        {/* فروشنده / خریدار */}
        <section className="mt-5 grid grid-cols-1 gap-4 text-xs sm:grid-cols-2">
          <div className="rounded-xl border border-slate-300 p-3">
            <h2 className="mb-1 text-sm font-bold">مشخصات فروشنده</h2>
            <InfoLine label="نام">{STORE_INFO.name}</InfoLine>
            {STORE_INFO.phone && <InfoLine label="تلفن">{STORE_INFO.phone}</InfoLine>}
            {STORE_INFO.address && <InfoLine label="نشانی">{STORE_INFO.address}</InfoLine>}
            {STORE_INFO.economicCode && <InfoLine label="کد اقتصادی">{toFaDigits(STORE_INFO.economicCode)}</InfoLine>}
            {STORE_INFO.website && <InfoLine label="وب‌سایت">{STORE_INFO.website}</InfoLine>}
          </div>
          <div className="rounded-xl border border-slate-300 p-3">
            <h2 className="mb-1 text-sm font-bold">مشخصات خریدار</h2>
            <InfoLine label="نام">{buyer.name}</InfoLine>
            <InfoLine label="موبایل">{toFaDigits(buyer.phone)}</InfoLine>
            {buyer.nationalCode && <InfoLine label="کد ملی">{toFaDigits(buyer.nationalCode)}</InfoLine>}
          </div>
        </section>

        {/* تحویل */}
        <section className="mt-4 rounded-xl border border-slate-300 p-3 text-xs">
          <h2 className="mb-1 text-sm font-bold">مشخصات تحویل</h2>
          <InfoLine label="روش ارسال">{SHIPPING_LABELS[order.shippingMethod] ?? "—"}</InfoLine>
          <InfoLine label="گیرنده">
            {a.recipientName} — {toFaDigits(a.recipientPhone)}
          </InfoLine>
          <InfoLine label="نشانی">
            {a.province}، {a.city}
            {a.neighborhood ? `، ${a.neighborhood}` : ""}، {a.addressLine}
            {a.plaque ? `، پلاک ${toFaDigits(a.plaque)}` : ""}
            {a.unit ? `، واحد ${toFaDigits(a.unit)}` : ""}
          </InfoLine>
          <InfoLine label="کد پستی">{toFaDigits(a.postalCode)}</InfoLine>
          <InfoLine label="زمان ارسال">{deliveryMessage(order.shippingMethod, a.city, order.deliveryTime)}</InfoLine>
          {order.trackingCode && (
            <InfoLine label="کد رهگیری پستی">
              <span dir="ltr">{order.trackingCode}</span>
            </InfoLine>
          )}
        </section>

        {/* اقلام */}
        <section className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-700 print:bg-slate-100">
                {["ردیف", "شرح کالا", "واحد", "تعداد", "قیمت واحد", "تخفیف", "مبلغ کل"].map((h) => (
                  <th key={h} className="border border-slate-300 px-2 py-2 text-center font-bold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {order.items.map((it, i) => (
                <tr key={it.id} className="break-inside-avoid">
                  <td className="border border-slate-300 px-2 py-2 text-center">{formatNumber(i + 1)}</td>
                  <td className="border border-slate-300 px-2 py-2">{it.name}</td>
                  <td className="border border-slate-300 px-2 py-2 text-center">{it.unitLabel}</td>
                  <td className="border border-slate-300 px-2 py-2 text-center">{formatNumber(it.quantity)}</td>
                  <td className="border border-slate-300 px-2 py-2 text-center">{formatNumber(it.unitPrice)}</td>
                  <td className="border border-slate-300 px-2 py-2 text-center">
                    {formatNumber((it.unitPrice - it.finalPrice) * it.quantity)}
                  </td>
                  <td className="border border-slate-300 px-2 py-2 text-center font-medium">
                    {formatNumber(it.finalPrice * it.quantity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-1 text-xs text-slate-500">همه‌ی مبالغ به تومان است.</p>
        </section>

        {/* جمع‌بندی */}
        <section className="mt-4 flex justify-end break-inside-avoid">
          <dl className="w-full max-w-xs space-y-2 rounded-xl border border-slate-300 p-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-600">جمع کالاها</dt>
              <dd>{formatToman(order.itemsTotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-600">تخفیف</dt>
              <dd>{formatToman(order.discountTotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-600">هزینه‌ی ارسال</dt>
              <dd>{order.shippingFee > 0 ? formatToman(order.shippingFee) : "رایگان"}</dd>
            </div>
            <div className="flex justify-between border-t border-slate-300 pt-2 text-base font-extrabold">
              <dt>مبلغ قابل پرداخت</dt>
              <dd>{formatToman(order.payable)}</dd>
            </div>
          </dl>
        </section>

        {order.note && (
          <p className="mt-4 text-xs leading-6">
            <span className="font-bold">توضیحات سفارش: </span>
            {order.note}
          </p>
        )}

        <footer className="mt-8 border-t border-slate-300 pt-3 text-center text-xs text-slate-500">
          از خرید شما سپاسگزاریم — {STORE_INFO.name}
        </footer>
      </article>
  );
}
