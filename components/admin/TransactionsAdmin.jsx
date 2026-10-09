"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Select } from "@/components/ui/select";
import Link from "next/link";
import { FaCheck, FaPlus, FaTimes } from "react-icons/fa";
import { Field, Spinner, btnPrimary, btnSecondary, inputCls } from "@/components/ui/form";
import AdminFilters from "@/components/admin/AdminFilters";
import ListFooter from "@/components/admin/ListFooter";
import { useInfiniteList } from "@/components/admin/useInfiniteList";
import { Card, EmptyRow, PageHeader, theadRowCls, trCls } from "@/components/admin/ui";
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHOD_OPTIONS,
  TRANSACTION_STATUS_META,
  TRANSACTION_STATUS_OPTIONS,
  TRANSACTION_TYPE_META,
  TRANSACTION_TYPE_OPTIONS,
} from "@/lib/admin-constants";
import { api } from "@/lib/api-client";
import { formatNumber, formatToman } from "@/lib/format";
import { formatJalaliDateTime } from "@/lib/jalali";
import { toFaDigits } from "@/lib/phone";
import { notify, useToastOnChange } from "@/lib/toast";
import { useConfirm } from "@/components/providers/ConfirmProvider";

const MODES = {
  ALL: {
    title: "تراکنش‌ها",
    description: "همه‌ی پرداخت‌ها و برگشت وجه‌ها",
    canCreate: false,
  },
  PAYMENT: {
    title: "پرداخت‌ها",
    description: "پرداخت‌های ثبت‌شده برای سفارش‌ها",
    canCreate: true,
    createTitle: "ثبت پرداخت",
    submitLabel: "ثبت پرداخت",
  },
  REFUND: {
    title: "برگشت وجه",
    description: "درخواست‌ها و برگشت وجه‌های سفارش‌ها؛ برگشت جدید «در انتظار» ثبت می‌شود و بعد از واریز باید تأیید شود",
    canCreate: true,
    createTitle: "ثبت برگشت وجه",
    submitLabel: "ثبت برگشت وجه",
  },
};

function Badge({ meta, fallback }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${meta?.color ?? "bg-slate-100 text-slate-600"}`}>
      {meta?.label ?? fallback}
    </span>
  );
}

/** mode: "ALL" | "PAYMENT" | "REFUND" */
export default function TransactionsAdmin({ mode = "ALL", filters, initial, defaultOrderCode = "" }) {
  const confirm = useConfirm();
  const cfg = MODES[mode];
  const list = useInfiniteList({ endpoint: "/api/admin/transactions", itemsKey: "transactions", filters, initial });
  const [error, setError] = useState("");
  useToastOnChange(error); // پیام خطا به‌صورت toast نشون داده می‌شه
  const [busyId, setBusyId] = useState(null);

  const [showForm, setShowForm] = useState(Boolean(defaultOrderCode));
  const defaultMethod = mode === "REFUND" ? "WALLET" : "ONLINE";
  const [form, setForm] = useState({ orderCode: defaultOrderCode, amount: "", method: defaultMethod, reference: "", note: "" });
  const [errors, setErrors] = useState({});
  const [creating, setCreating] = useState(false);

  function setField(name, value) {
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((e) => (e[name] ? { ...e, [name]: undefined } : e));
  }

  async function handleCreate(e) {
    e.preventDefault();
    setCreating(true);
    setErrors({});
    setError("");
    try {
      await api("POST", "/api/admin/transactions", {
        type: mode,
        orderCode: form.orderCode,
        amount: form.amount,
        method: form.method,
        reference: form.reference || null,
        note: form.note || null,
      });
      notify.success("تراکنش ثبت شد.");
      setForm({ orderCode: "", amount: "", method: defaultMethod, reference: "", note: "" });
      setShowForm(false);
      list.reload();
    } catch (err) {
      if (err.fields && Object.keys(err.fields).length) setErrors(err.fields);
      else setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function setStatus(t, status) {
    const label = TRANSACTION_STATUS_META[status].label;
    if (!(await confirm({ title: "تغییر وضعیت تراکنش", description: `تراکنش سفارش ${toFaDigits(t.orderCode)} «${label}» شود؟ این کار قابل بازگشت نیست.`, confirmText: "تأیید" }))) return;
    setBusyId(t.id);
    setError("");
    try {
      const data = await api("PATCH", `/api/admin/transactions/${t.id}`, { status });
      notify.success("وضعیت تراکنش تغییر کرد.");
      list.patchItem(t.id, data.transaction);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  const statusOptions = TRANSACTION_STATUS_OPTIONS;
  const selects = [
    ...(mode === "ALL" ? [{ name: "type", label: "نوع", options: TRANSACTION_TYPE_OPTIONS }] : []),
    { name: "status", label: "وضعیت", options: statusOptions },
    { name: "method", label: "روش", options: PAYMENT_METHOD_OPTIONS },
  ];

  return (
    <div>
      <PageHeader title={cfg.title} description={`${cfg.description} — ${formatNumber(list.total)} مورد`}>
        {cfg.canCreate && !showForm && (
          <button type="button" onClick={() => setShowForm(true)} className={cn(btnPrimary, "h-10 w-auto px-4")}>
            <FaPlus size={14} />
            {cfg.createTitle}
          </button>
        )}
      </PageHeader>


      {cfg.canCreate && showForm && (
        <Card title={cfg.createTitle} className="mb-4">
          <form onSubmit={handleCreate} noValidate className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="کد سفارش (۸ رقمی)" htmlFor="tOrder" error={errors.orderCode} required>
                <input id="tOrder" dir="ltr" inputMode="numeric" value={form.orderCode} onChange={(e) => setField("orderCode", e.target.value)} className={inputCls(Boolean(errors.orderCode))} />
              </Field>
              <Field label="مبلغ (تومان)" htmlFor="tAmount" error={errors.amount} required>
                <input id="tAmount" inputMode="numeric" value={form.amount} onChange={(e) => setField("amount", e.target.value)} className={inputCls(Boolean(errors.amount))} />
              </Field>
              <Field label={mode === "REFUND" ? "روش برگشت" : "روش پرداخت"} htmlFor="tMethod" error={errors.method}>
                <Select id="tMethod" value={form.method} onChange={(e) => setField("method", e.target.value)} className={inputCls(Boolean(errors.method))}>
                  {/* پرداخت با «کیف پول» فقط توسط خود کاربر انجام می‌شه؛ برگشت وجه به «کیف پول» فوراً به اعتبار کاربر اضافه می‌شه */}
                  {PAYMENT_METHOD_OPTIONS.filter((m) => mode === "REFUND" || m.value !== "WALLET").map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="شماره پیگیری" htmlFor="tRef" error={errors.reference}>
                <input id="tRef" dir="ltr" value={form.reference} onChange={(e) => setField("reference", e.target.value)} className={inputCls(Boolean(errors.reference))} />
              </Field>
            </div>
            {mode === "REFUND" && form.method === "WALLET" && (
              <p className="rounded-xl bg-green-50 p-3 text-xs leading-6 text-green-800">
                با روش «کیف پول»، مبلغ همین الان به کیف پول کاربر اضافه می‌شود و تراکنش «موفق» ثبت می‌شود. برای برگشت از راه‌های دیگر (کارت/درگاه)، تراکنش «در انتظار» ثبت می‌شود و بعد از واریز باید تأیید شود.
              </p>
            )}
            <Field label="توضیحات" htmlFor="tNote" error={errors.note}>
              <input id="tNote" value={form.note} onChange={(e) => setField("note", e.target.value)} className={inputCls(Boolean(errors.note))} />
            </Field>
            <div className="flex flex-wrap gap-2">
              <button type="submit" disabled={creating} className={cn(btnPrimary, "w-auto px-6")}>
                {creating && <Spinner />}
                {cfg.submitLabel}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className={cn(btnSecondary, "px-6")}>
                انصراف
              </button>
            </div>
          </form>
        </Card>
      )}

      <AdminFilters placeholder="کد سفارش، شماره پیگیری، نام یا موبایل کاربر…" selects={selects} />

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-start text-xs">
            <thead>
              <tr className={theadRowCls}>
                <th className="py-2.5 ps-3 pe-3 font-medium">سفارش</th>
                <th className="py-2.5 pe-3 font-medium">کاربر</th>
                {mode === "ALL" && <th className="py-2.5 pe-3 font-medium">نوع</th>}
                <th className="py-2.5 pe-3 font-medium">مبلغ</th>
                <th className="py-2.5 pe-3 font-medium">روش</th>
                <th className="py-2.5 pe-3 font-medium">تاریخ</th>
                <th className="py-2.5 pe-3 font-medium">وضعیت</th>
                <th className="py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {list.items.map((t) => (
                <tr key={t.id} className={`${trCls} align-top`}>
                  <td className="py-3 ps-3 pe-3">
                    <Link href={`/admin/orders/${t.orderCode}`} className="font-bold text-slate-800 hover:text-green-700" dir="ltr">
                      {toFaDigits(t.orderCode)}
                    </Link>
                    {t.reference && <p className="mt-0.5 text-xs text-slate-400" dir="ltr">{toFaDigits(t.reference)}</p>}
                  </td>
                  <td className="py-3 pe-3 text-slate-600">
                    <Link href={`/admin/users/${t.user.id}`} className="hover:text-green-700">
                      {t.user.name}
                    </Link>
                  </td>
                  {mode === "ALL" && (
                    <td className="py-3 pe-3">
                      <Badge meta={TRANSACTION_TYPE_META[t.type]} fallback={t.type} />
                    </td>
                  )}
                  <td className={`py-3 pe-3 font-medium ${t.type === "REFUND" ? "text-orange-700" : "text-slate-800"}`}>
                    {t.type === "REFUND" ? "−" : ""}
                    {formatToman(t.amount)}
                  </td>
                  <td className="py-3 pe-3 text-slate-600">{PAYMENT_METHOD_LABELS[t.method] ?? t.method}</td>
                  <td className="whitespace-nowrap py-3 pe-3 text-slate-600">{formatJalaliDateTime(t.createdAt)}</td>
                  <td className="py-3 pe-3">
                    <Badge meta={TRANSACTION_STATUS_META[t.status]} fallback={t.status} />
                    {t.note && <p className="mt-1 max-w-[180px] text-xs text-slate-400">{t.note}</p>}
                  </td>
                  <td className="py-3">
                    {t.status === "PENDING" &&
                      (busyId === t.id ? (
                        <Spinner />
                      ) : (
                        <div className="flex items-center gap-3">
                          <button type="button" onClick={() => setStatus(t, "SUCCESS")} aria-label="تأیید" title="تأیید" className="text-green-700 hover:text-green-800">
                            <FaCheck size={14} />
                          </button>
                          <button type="button" onClick={() => setStatus(t, "FAILED")} aria-label="رد" title="رد" className="text-slate-500 hover:text-red-600">
                            <FaTimes size={14} />
                          </button>
                        </div>
                      ))}
                  </td>
                </tr>
              ))}
              {list.items.length === 0 && !list.loading && <EmptyRow colSpan={mode === "ALL" ? 8 : 7}>تراکنشی پیدا نشد.</EmptyRow>}
            </tbody>
          </table>
        </div>
        <ListFooter list={list} />
      </Card>
    </div>
  );
}
