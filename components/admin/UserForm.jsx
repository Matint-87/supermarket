"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Select } from "@/components/ui/select";
import { Field, Spinner, btnPrimary, btnSecondary, inputCls } from "@/components/ui/form";
import { ROLE_OPTIONS } from "@/lib/admin-constants";
import { api } from "@/lib/api-client";
import { notify, useToastOnChange } from "@/lib/toast";

function toFormValues(user) {
  return {
    phone: user?.phone ?? "",
    firstName: user?.firstName ?? "",
    lastName: user?.lastName ?? "",
    email: user?.email ?? "",
    nationalCode: user?.nationalCode ?? "",
    role: user?.role ?? "USER",
    isActive: user?.isActive ?? true,
  };
}

/**
 * فرم مشترک ساخت و ویرایش کاربر.
 * user نباشه → ساخت (POST)، باشه → ویرایش (PATCH).
 * isSelf: ادمین در حال ویرایش حساب خودشه؛ نقش و وضعیت قفل می‌شن (سرور هم همین قاعده رو اعمال می‌کنه).
 */
export default function UserForm({ user = null, isSelf = false, onDone, onCancel }) {
  const [values, setValues] = useState(() => toFormValues(user));
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  useToastOnChange(formError); // پیام خطا به‌صورت toast نشون داده می‌شه
  const [busy, setBusy] = useState(false);

  function setField(name, value) {
    setValues((v) => ({ ...v, [name]: value }));
    setErrors((e) => (e[name] ? { ...e, [name]: undefined } : e));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setFormError("");
    try {
      const data = user
        ? await api("PATCH", `/api/admin/users/${user.id}`, values)
        : await api("POST", "/api/admin/users", values);
      notify.success("اطلاعات کاربر ذخیره شد.");
      onDone?.(data.user);
    } catch (err) {
      if (err.fields && Object.keys(err.fields).length) setErrors(err.fields);
      else setFormError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="شماره موبایل" htmlFor="phone" error={errors.phone} required>
          <input
            id="phone"
            dir="ltr"
            inputMode="tel"
            value={values.phone}
            onChange={(e) => setField("phone", e.target.value)}
            placeholder="09123456789"
            className={`${inputCls(Boolean(errors.phone))} text-start`}
          />
        </Field>

        <Field label="ایمیل" htmlFor="email" error={errors.email}>
          <input
            id="email"
            type="email"
            dir="ltr"
            value={values.email}
            onChange={(e) => setField("email", e.target.value)}
            className={`${inputCls(Boolean(errors.email))} text-start`}
          />
        </Field>

        <Field label="نام" htmlFor="firstName" error={errors.firstName}>
          <input
            id="firstName"
            value={values.firstName}
            onChange={(e) => setField("firstName", e.target.value)}
            className={inputCls(Boolean(errors.firstName))}
          />
        </Field>

        <Field label="نام خانوادگی" htmlFor="lastName" error={errors.lastName}>
          <input
            id="lastName"
            value={values.lastName}
            onChange={(e) => setField("lastName", e.target.value)}
            className={inputCls(Boolean(errors.lastName))}
          />
        </Field>

        <Field label="کد ملی" htmlFor="nationalCode" error={errors.nationalCode}>
          <input
            id="nationalCode"
            dir="ltr"
            inputMode="numeric"
            value={values.nationalCode}
            onChange={(e) => setField("nationalCode", e.target.value)}
            className={`${inputCls(Boolean(errors.nationalCode))} text-start`}
          />
        </Field>

        <Field
          label="نقش"
          htmlFor="role"
          error={errors.role}
          hint={isSelf ? "نقش حساب خودتان قابل تغییر نیست." : undefined}
        >
          <Select
            id="role"
            value={values.role}
            onChange={(e) => setField("role", e.target.value)}
            disabled={isSelf}
            className={inputCls(Boolean(errors.role))}
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <label className="flex items-center gap-2 text-xs text-slate-700">
        <input
          type="checkbox"
          checked={values.isActive}
          disabled={isSelf}
          onChange={(e) => setField("isActive", e.target.checked)}
        />
        حساب فعال است (با برداشتن تیک، کاربر مسدود می‌شود و از حسابش خارج می‌شود)
      </label>

      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={busy} className={cn(btnPrimary, "w-auto flex-1 px-6")}>
          {busy ? <Spinner /> : user ? "ذخیره تغییرات" : "افزودن کاربر"}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className={cn(btnSecondary, "w-auto px-6")}>
            انصراف
          </button>
        )}
      </div>
    </form>
  );
}
