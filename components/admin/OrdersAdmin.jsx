"use client";

import { useState } from "react";
import { Select } from "@/components/ui/select";
import Link from "next/link";
import { FaFileInvoice, FaPrint } from "react-icons/fa";
import AdminFilters from "@/components/admin/AdminFilters";
import DateRangeFilter from "@/components/admin/DateRangeFilter";
import ListFooter from "@/components/admin/ListFooter";
import { useInfiniteList } from "@/components/admin/useInfiniteList";
import { Card, EmptyRow, PageHeader, theadRowCls, trCls } from "@/components/admin/ui";
import CancelOrderDialog from "@/components/orders/CancelOrderDialog";
import { Spinner } from "@/components/ui/form";
import { ORDER_STATUS_META, ORDER_STATUS_OPTIONS } from "@/lib/admin-constants";
import { api } from "@/lib/api-client";
import { ADMIN_CANCEL_REASONS, PAYMENT_STATUS_META } from "@/lib/order-constants";
import { formatNumber, formatToman } from "@/lib/format";
import { formatJalaliDateTime } from "@/lib/jalali";
import { toFaDigits } from "@/lib/phone";
import { SHIPPING_LABELS, SHIPPING_METHODS } from "@/lib/shipping";
import { notify } from "@/lib/toast";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MAX_PRINT = 50; // هم‌خوان با صفحه‌ی چاپ گروهی

export default function OrdersAdmin({ filters, initial }) {
  const list = useInfiniteList({ endpoint: "/api/admin/orders", itemsKey: "orders", filters, initial });
  const [selected, setSelected] = useState(() => new Set());
  const [busyId, setBusyId] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null); // سفارشی که دیالوگ لغوش بازه

  const codes = [...selected];
  const allChecked = list.items.length > 0 && list.items.every((o) => selected.has(o.code));

  function toggle(code) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allChecked ? new Set() : new Set(list.items.slice(0, MAX_PRINT).map((o) => o.code)));
  }

  function printSelected() {
    if (codes.length === 0) return;
    window.open(`/admin/print/invoices?codes=${codes.slice(0, MAX_PRINT).join(",")}`, "_blank", "noopener");
  }

  /** تغییر وضعیت از داخل خود لیست (بدون رفتن به صفحه‌ی جزئیات) */
  async function changeStatus(order, next, cancelReason) {
    if (next === order.status) return;
    // لغو فقط با دلیل: دیالوگ دلیل باز می‌شه
    if (next === "CANCELED" && !cancelReason) {
      setCancelTarget(order);
      return;
    }
    setBusyId(order.id);
    try {
      const data = await api("PATCH", `/api/admin/orders/${order.code}`, { status: next, cancelReason });
      list.patchItem(order.id, { status: next });
      notify.success(
        data.refunded > 0
          ? `سفارش لغو شد و ${formatToman(data.refunded)} به کیف پول مشتری برگشت.`
          : `سفارش ${toFaDigits(order.code)}: «${ORDER_STATUS_META[next].label}»`,
      );
    } catch (err) {
      notify.error(err.message);
      throw err;
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="سفارش‌ها"
        description={`پیگیری و تغییر وضعیت سفارش‌های ثبت‌شده — ${formatNumber(list.total)} سفارش`}
      >
        <button
          type="button"
          onClick={printSelected}
          disabled={codes.length === 0}
          className={cn(buttonVariants({ size: "sm" }), "flex")}
        >
          <FaPrint size={12} />
          {codes.length > 0 ? `چاپ فاکتور (${formatNumber(codes.length)})` : "چاپ فاکتورهای انتخاب‌شده"}
        </button>
      </PageHeader>

      <AdminFilters
        placeholder="کد سفارش، نام یا موبایل گیرنده…"
        selects={[
          { name: "status", label: "وضعیت", options: ORDER_STATUS_OPTIONS },
          { name: "shipping", label: "روش ارسال", options: SHIPPING_METHODS },
        ]}
      />
      <DateRangeFilter />

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-start text-xs">
            <thead>
              <tr className={theadRowCls}>
                <th className="w-9 py-2.5 ps-3 pe-2">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    onChange={toggleAll}
                    aria-label="انتخاب همه‌ی سفارش‌های لیست برای چاپ"
                    className="h-4 w-4 cursor-pointer accent-green-700"
                  />
                </th>
                <th className="py-2.5 pe-3 font-medium">کد سفارش</th>
                <th className="py-2.5 pe-3 font-medium">گیرنده</th>
                <th className="py-2.5 pe-3 font-medium">تاریخ ثبت</th>
                <th className="py-2.5 pe-3 font-medium">ارسال</th>
                <th className="py-2.5 pe-3 font-medium">مبلغ</th>
                <th className="py-2.5 pe-3 font-medium">پرداخت</th>
                <th className="py-2.5 pe-3 font-medium">وضعیت</th>
                <th className="py-2.5 pe-3 font-medium">فاکتور</th>
              </tr>
            </thead>
            <tbody>
              {list.items.map((o) => {
                const dead = o.status === "CANCELED" || o.status === "RETURNED";
                const meta = ORDER_STATUS_META[o.status];
                return (
                  <tr key={o.id} className={`${trCls} ${selected.has(o.code) ? "bg-green-50/50" : ""}`}>
                    <td className="py-3 ps-3 pe-2">
                      <input
                        type="checkbox"
                        checked={selected.has(o.code)}
                        onChange={() => toggle(o.code)}
                        aria-label={`انتخاب سفارش ${toFaDigits(o.code)}`}
                        className="h-4 w-4 cursor-pointer accent-green-700"
                      />
                    </td>
                    <td className="py-3 pe-3">
                      <Link href={`/admin/orders/${o.code}`} className="font-bold text-slate-800 hover:text-green-700" dir="ltr">
                        {toFaDigits(o.code)}
                      </Link>
                    </td>
                    <td className="py-3 pe-3 text-slate-600">{o.buyerName}</td>
                    <td className="py-3 pe-3 whitespace-nowrap text-slate-600">{formatJalaliDateTime(o.createdAt)}</td>
                    <td className="py-3 pe-3 text-slate-600">
                      {SHIPPING_LABELS[o.shippingMethod] ?? "—"}
                      {o.shippingMethod === "POST" && o.status === "SHIPPING" && !o.trackingCode && (
                        <span className="mt-0.5 block text-[11px] font-medium text-amber-600">بدون کد رهگیری</span>
                      )}
                    </td>
                    <td className="py-3 pe-3 font-medium text-slate-700">{formatToman(o.payable)}</td>
                    <td className="py-3 pe-3">
                      {dead ? (
                        <span className="text-slate-400">—</span>
                      ) : (
                        <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-bold ${PAYMENT_STATUS_META[o.payment.status].color}`}>
                          {PAYMENT_STATUS_META[o.payment.status].label}
                        </span>
                      )}
                    </td>
                    <td className="py-3 pe-3">
                      {/* سفارش لغوشده نهایی‌ه و دوباره فعال نمی‌شه (هم‌قاعده با صفحه‌ی جزئیات) */}
                      <div className="flex items-center gap-1.5">
                        <Select
                          value={o.status}
                          onChange={(e) => changeStatus(o, e.target.value).catch(() => {})}
                          disabled={busyId === o.id || o.status === "CANCELED"}
                          aria-label={`وضعیت سفارش ${toFaDigits(o.code)}`}
                          className={`h-8 cursor-pointer rounded-full border-0 px-2.5 text-xs font-bold outline-none ring-1 ring-black/5 transition focus:ring-2 focus:ring-green-600/40 disabled:cursor-not-allowed ${meta?.color ?? ""}`}
                        >
                          {ORDER_STATUS_OPTIONS.map((s) => (
                            <option key={s.value} value={s.value} className="bg-white text-slate-800">
                              {s.label}
                            </option>
                          ))}
                        </Select>
                        {busyId === o.id && <Spinner />}
                      </div>
                    </td>
                    <td className="py-3 pe-3">
                      <a
                        href={`/admin/print/invoices?codes=${o.code}`}
                        target="_blank"
                        rel="noopener"
                        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8 px-3 text-xs")}
                      >
                        <FaFileInvoice size={11} /> فاکتور
                      </a>
                    </td>
                  </tr>
                );
              })}
              {list.items.length === 0 && !list.loading && <EmptyRow colSpan={9}>سفارشی پیدا نشد.</EmptyRow>}
            </tbody>
          </table>
        </div>
        <ListFooter list={list} />
      </Card>

      <CancelOrderDialog
        open={Boolean(cancelTarget)}
        onOpenChange={(v) => !v && setCancelTarget(null)}
        reasons={ADMIN_CANCEL_REASONS}
        title={cancelTarget ? `لغو سفارش ${toFaDigits(cancelTarget.code)}` : "لغو سفارش"}
        description="کالاها به انبار برمی‌گردند و مبلغ پرداخت‌شده (اگر باشد) به کیف پول مشتری برمی‌گردد. این کار قابل بازگشت نیست."
        onSubmit={(reason) => changeStatus(cancelTarget, "CANCELED", reason)}
      />
    </div>
  );
}
