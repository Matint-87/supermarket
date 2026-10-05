"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Select } from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { Card } from "@/components/admin/ui";
import { Field, Spinner, btnPrimary, inputCls } from "@/components/ui/form";
import { api } from "@/lib/api-client";
import { formatToman } from "@/lib/format";
import { formatJalaliDateTime } from "@/lib/jalali";
import { toFaDigits } from "@/lib/phone";
import { WALLET_REASON_LABELS } from "@/lib/order-constants";
import { notify, useToastOnChange } from "@/lib/toast";
import { useConfirm } from "@/components/providers/ConfirmProvider";

/** کیف پول کاربر در پنل مدیریت: موجودی، شارژ/کسر دستی (با دلیل اجباری) و آخرین تراکنش‌ها */
export default function WalletCard({ userId, wallet }) {
  const router = useRouter();
  const confirm = useConfirm();
  const [form, setForm] = useState({ type: "CREDIT", amount: "", note: "" });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  useToastOnChange(error);
  const [busy, setBusy] = useState(false);

  function setField(name, value) {
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((e) => (e[name] ? { ...e, [name]: undefined } : e));
  }

  async function submit(e) {
    e.preventDefault();
    setErrors({});
    setError("");
    const label = form.type === "CREDIT" ? "شارژ" : "کسر";
    const amountText = form.amount ? ` ${toFaDigits(String(form.amount))} تومان` : "";
    if (!(await confirm({ title: `${label} کیف پول`, description: `${label}${amountText} کیف پول این کاربر انجام شود؟`, confirmText: label, destructive: form.type === "DEBIT" }))) return;
    setBusy(true);
    try {
      await api("POST", `/api/admin/users/${userId}/wallet`, form);
      notify.success("کیف پول به‌روز شد.");
      setForm({ type: "CREDIT", amount: "", note: "" });
      router.refresh();
    } catch (err) {
      if (err.fields && Object.keys(err.fields).length) setErrors(err.fields);
      else setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="کیف پول">
      <p className="text-xs text-slate-500">موجودی فعلی</p>
      <p className="mb-3 text-xl font-extrabold text-slate-800">{formatToman(wallet.balance)}</p>

      <form onSubmit={submit} noValidate className="space-y-3 border-t border-slate-100 pt-3">
        <div className="grid grid-cols-2 gap-2">
          <Field label="نوع" htmlFor="wType" error={errors.type}>
            <Select id="wType" value={form.type} onChange={(e) => setField("type", e.target.value)} className={inputCls(Boolean(errors.type))}>
              <option value="CREDIT">شارژ (افزایش)</option>
              <option value="DEBIT">کسر (کاهش)</option>
            </Select>
          </Field>
          <Field label="مبلغ (تومان)" htmlFor="wAmount" error={errors.amount}>
            <input id="wAmount" inputMode="numeric" value={form.amount} onChange={(e) => setField("amount", e.target.value)} className={inputCls(Boolean(errors.amount))} />
          </Field>
        </div>
        <Field label="دلیل (الزامی)" htmlFor="wNote" error={errors.note}>
          <input id="wNote" value={form.note} onChange={(e) => setField("note", e.target.value)} className={inputCls(Boolean(errors.note))} />
        </Field>
        <button type="submit" disabled={busy} className={cn(btnPrimary, "h-10 text-xs")}>
          {busy && <Spinner />}
          ثبت تغییر
        </button>
      </form>

      {wallet.transactions.length > 0 && (
        <ul className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-xs">
          {wallet.transactions.map((t) => (
            <li key={t.id} className="flex items-start justify-between gap-2">
              <span className="min-w-0">
                <span className="block font-medium text-slate-700">
                  {WALLET_REASON_LABELS[t.reason] ?? t.reason}
                  {t.orderCode ? ` — ${toFaDigits(t.orderCode)}` : ""}
                </span>
                {t.note && <span className="block truncate text-slate-400">{t.note}</span>}
                <span className="block text-slate-400">{formatJalaliDateTime(t.createdAt)}</span>
              </span>
              <span className={`shrink-0 font-bold ${t.type === "CREDIT" ? "text-emerald-600" : "text-rose-600"}`}>
                {t.type === "CREDIT" ? "+" : "−"}
                {formatToman(t.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
