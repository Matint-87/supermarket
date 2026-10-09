"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Field, Spinner, btnPrimary, inputCls } from "@/components/ui/form";
import { Card, PageHeader } from "@/components/admin/ui";
import { api } from "@/lib/api-client";
import { notify, useToastOnChange } from "@/lib/toast";

function Toggle({ id, checked, onChange, title, description }) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 transition hover:border-green-200">
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5" />
      <span>
        <span className="block text-xs font-bold text-slate-800">{title}</span>
        <span className="mt-0.5 block text-xs text-slate-500">{description}</span>
      </span>
    </label>
  );
}

export default function ShippingSettingsForm({ initial }) {
  const [form, setForm] = useState({
    ...initial,
    defaultFee: String(initial.defaultFee),
    freeShippingOver: String(initial.freeShippingOver),
  });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  useToastOnChange(error); // پیام خطا به‌صورت toast نشون داده می‌شه
  const [busy, setBusy] = useState(false);

  function setField(name, value) {
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((e) => (e[name] ? { ...e, [name]: undefined } : e));
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setError("");
    try {
      await api("PUT", "/api/admin/shipping-settings", form);
      notify.success("تنظیمات ارسال ذخیره شد.");
    } catch (err) {
      if (err.fields && Object.keys(err.fields).length) setErrors(err.fields);
      else setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader title="تنظیمات ارسال" description="روش‌های ارسال فعال، هزینه‌ی پیش‌فرض و زمان تحویل" />
      <form onSubmit={submit} noValidate className="space-y-4">

        <Card title="روش‌های ارسال">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Toggle id="post" checked={form.postEnabled} onChange={(v) => setField("postEnabled", v)} title="ارسال با پست" description="ارسال به سراسر کشور" />
            <Toggle id="courier" checked={form.courierEnabled} onChange={(v) => setField("courierEnabled", v)} title="ارسال با پیک" description="تحویل درب منزل با پیک فروشگاه" />
            <Toggle id="pickup" checked={form.pickupEnabled} onChange={(v) => setField("pickupEnabled", v)} title="دریافت حضوری" description="تحویل در فروشگاه" />
          </div>
          <Field label="آدرس فروشگاه (برای دریافت حضوری)" htmlFor="pickupAddress" error={errors.pickupAddress} className="mt-4">
            <input id="pickupAddress" value={form.pickupAddress} onChange={(e) => setField("pickupAddress", e.target.value)} className={inputCls(Boolean(errors.pickupAddress))} />
          </Field>
        </Card>

        <Card title="هزینه">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="هزینه‌ی پیش‌فرض ارسال (تومان)" htmlFor="defaultFee" error={errors.defaultFee} hint="برای مناطقی که در هیچ محدوده‌ای نیستند. صفر = رایگان">
              <input id="defaultFee" type="number" min="0" value={form.defaultFee} onChange={(e) => setField("defaultFee", e.target.value)} className={inputCls(Boolean(errors.defaultFee))} />
            </Field>
            <Field label="ارسال رایگان برای سفارش بالای (تومان)" htmlFor="freeOver" error={errors.freeShippingOver} hint="صفر = ارسال رایگان نداریم">
              <input id="freeOver" type="number" min="0" value={form.freeShippingOver} onChange={(e) => setField("freeShippingOver", e.target.value)} className={inputCls(Boolean(errors.freeShippingOver))} />
            </Field>
          </div>
        </Card>

        <Card title="زمان تحویل">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="تهران" htmlFor="tehranTime" error={errors.tehranDeliveryTime}>
              <input id="tehranTime" value={form.tehranDeliveryTime} onChange={(e) => setField("tehranDeliveryTime", e.target.value)} className={inputCls(Boolean(errors.tehranDeliveryTime))} />
            </Field>
            <Field label="سایر مناطق" htmlFor="otherTime" error={errors.otherDeliveryTime}>
              <input id="otherTime" value={form.otherDeliveryTime} onChange={(e) => setField("otherDeliveryTime", e.target.value)} className={inputCls(Boolean(errors.otherDeliveryTime))} />
            </Field>
          </div>
          <Field label="توضیحات ارسال" htmlFor="note" error={errors.note} className="mt-4">
            <textarea id="note" rows={3} value={form.note} onChange={(e) => setField("note", e.target.value)} className={`${inputCls(Boolean(errors.note))} h-auto py-3`} />
          </Field>
        </Card>

        <button type="submit" disabled={busy} className={cn(btnPrimary, "w-auto px-8")}>
          {busy && <Spinner />}
          ذخیره‌ی تنظیمات
        </button>
      </form>
    </div>
  );
}
