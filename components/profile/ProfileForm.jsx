"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";
import { toEnglishDigits } from "@/lib/phone";
import { Field, Spinner, btnPrimary, btnSecondary, inputCls } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import JalaliDateField from "./JalaliDateField";
import { notify, useToastOnChange } from "@/lib/toast";

const GENDERS = [
  { value: "MALE", label: "آقا" },
  { value: "FEMALE", label: "خانم" },
];

export default function ProfileForm({ user, submitLabel = "ذخیره و ادامه", onSaved, onCancel }) {
  const [form, setForm] = useState({
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    email: user.email ?? "",
    nationalCode: user.nationalCode ?? "",
    birthDate: user.birthDate ?? "",
    gender: user.gender ?? "",
    smsPromoOptIn: user.smsPromoOptIn ?? false,
  });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  useToastOnChange(formError); // پیام خطا به‌صورت toast نشون داده می‌شه
  const [busy, setBusy] = useState(false);

  function setField(name, value) {
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((e) => (e[name] ? { ...e, [name]: undefined } : e));
  }

  async function submit(e) {
    e.preventDefault();
    setFormError("");
    setBusy(true);
    try {
      const data = await api("PUT", "/api/profile", {
        ...form,
        gender: form.gender || null,
        nationalCode: toEnglishDigits(form.nationalCode),
      });
      notify.success("اطلاعات شما ذخیره شد.");
      onSaved?.(data.user);
    } catch (err) {
      if (err.fields && Object.keys(err.fields).length) setErrors(err.fields);
      else setFormError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="نام" htmlFor="firstName" error={errors.firstName} required>
          <input
            id="firstName"
            autoFocus
            value={form.firstName}
            onChange={(e) => setField("firstName", e.target.value)}
            className={inputCls(Boolean(errors.firstName))}
          />
        </Field>
        <Field label="نام خانوادگی" htmlFor="lastName" error={errors.lastName} required>
          <input
            id="lastName"
            value={form.lastName}
            onChange={(e) => setField("lastName", e.target.value)}
            className={inputCls(Boolean(errors.lastName))}
          />
        </Field>

        <Field label="کد ملی" htmlFor="nationalCode" error={errors.nationalCode}>
          <input
            id="nationalCode"
            dir="ltr"
            inputMode="numeric"
            value={form.nationalCode}
            onChange={(e) => setField("nationalCode", toEnglishDigits(e.target.value).replace(/\D/g, "").slice(0, 10))}
            className={`${inputCls(Boolean(errors.nationalCode))} text-left tracking-wider`}
          />
        </Field>
        <Field label="ایمیل" htmlFor="email" error={errors.email}>
          <input
            id="email"
            type="email"
            dir="ltr"
            value={form.email}
            onChange={(e) => setField("email", e.target.value)}
            className={`${inputCls(Boolean(errors.email))} text-left`}
          />
        </Field>

        <JalaliDateField value={form.birthDate} onChange={(v) => setField("birthDate", v)} error={errors.birthDate} />

        <Field label="جنسیت">
          <div className="flex h-12 items-center gap-4">
            {GENDERS.map((g) => (
              <label key={g.value} className="flex items-center gap-1.5 text-sm text-slate-700">
                <input
                  type="radio"
                  name="gender"
                  checked={form.gender === g.value}
                  onChange={() => setField("gender", g.value)}
                  className="h-4 w-4 border-slate-300 text-green-700 focus:ring-green-600/30"
                />
                {g.label}
              </label>
            ))}
          </div>
        </Field>
      </div>

      <label className="flex items-start gap-2 text-xs leading-6 text-slate-600">
        <input
          type="checkbox"
          checked={form.smsPromoOptIn}
          onChange={(e) => setField("smsPromoOptIn", e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-green-700 focus:ring-green-600/30"
        />
        مایلم پیامک‌های تخفیف و پیشنهادهای ویژه دریافت کنم
      </label>


      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={busy} className={cn(btnPrimary, onCancel && "w-auto flex-1")}>
          {busy && <Spinner />}
          {submitLabel}
        </button>
        {/* دکمه‌ی انصراف فقط وقتی والد onCancel بده (حالت «ویرایش»؛ نه ویزارد اول ثبت‌نام) */}
        {onCancel && (
          <button type="button" onClick={onCancel} disabled={busy} className={cn(btnSecondary, "w-auto px-6")}>
            انصراف
          </button>
        )}
      </div>
    </form>
  );
}
