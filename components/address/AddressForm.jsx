"use client";

import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { FaCrosshairs, FaEdit, FaMapMarkedAlt } from "react-icons/fa";
import { api } from "@/lib/api-client";
import { normalizeMobile, toEnglishDigits } from "@/lib/phone";
import { Field, Spinner, btnPrimary, btnSecondary, inputCls } from "@/components/ui/form";
import { CitySelect, ProvinceSelect } from "./PlaceSelect";
import { notify, useToastOnChange } from "@/lib/toast";
import { buttonVariants } from "@/components/ui/button";

const MapPicker = dynamic(() => import("./MapPicker"), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-400 sm:h-80">
      در حال بارگذاری نقشه...
    </div>
  ),
});

const emptyForm = {
  label: "",
  recipientName: "",
  recipientPhone: "",
  province: "",
  city: "",
  neighborhood: "",
  addressLine: "",
  plaque: "",
  unit: "",
  postalCode: "",
  isDefault: false,
};

function toForm(a) {
  if (!a) return emptyForm;
  return {
    label: a.label ?? "",
    recipientName: a.recipientName ?? "",
    recipientPhone: a.recipientPhone ?? "",
    province: a.province ?? "",
    city: a.city ?? "",
    neighborhood: a.neighborhood ?? "",
    addressLine: a.addressLine ?? "",
    plaque: a.plaque ?? "",
    unit: a.unit ?? "",
    postalCode: a.postalCode ?? "",
    isDefault: a.isDefault ?? false,
  };
}

const MODES = [
  { key: "manual", label: "ثبت دستی", icon: FaEdit },
  { key: "map", label: "موقعیت مکانی", icon: FaMapMarkedAlt },
];

/**
 * فرم افزودن/ویرایش آدرس. کاربر یا خودش دستی پر می‌کنه، یا حالت «موقعیت مکانی» رو انتخاب می‌کنه:
 * اون‌وقت (با اجازه‌ی خودش) موقعیت فعلی‌ش روی نقشه نشون داده می‌شه تا فقط پین رو دقیق‌تر جابه‌جا کنه،
 * و استان/شهر/محله/خیابان (در صورت وجود) خودکار پر می‌شه — بعد هرچی رو خواست دستی اصلاح می‌کنه.
 * کد پستی همیشه باید دستی تأیید بشه چون سرویس نقشه به‌ندرت کد پستی دقیق ایران می‌ده.
 */
export default function AddressForm({ initialAddress, showDefaultToggle = true, onSaved, onCancel }) {
  const isEdit = Boolean(initialAddress?.id);
  const [form, setForm] = useState(() => toForm(initialAddress));
  const [coords, setCoords] = useState(
    initialAddress?.latitude != null ? { lat: initialAddress.latitude, lng: initialAddress.longitude } : null,
  );
  const [mode, setMode] = useState(coords ? "map" : "manual");
  // idle: هنوز چیزی نپرسیدیم | asked: کاربر اجازه داد (منتظر نتیجه‌ی مرورگر) | granted/denied: نتیجه معلوم شد | skipped: کاربر خودش رد کرد
  const [locationConsent, setLocationConsent] = useState(coords ? "skipped" : "idle");
  const [geoStatus, setGeoStatus] = useState(""); // "" | "loading" | "found" | "notfound"
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  useToastOnChange(formError); // پیام خطا به‌صورت toast نشون داده می‌شه
  const [busy, setBusy] = useState(false);

  function setField(name, value) {
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((e) => (e[name] ? { ...e, [name]: undefined } : e));
  }

  function selectMode(next) {
    setMode(next);
    if (next === "manual") setGeoStatus("");
  }

  async function handleMapChange(point) {
    setCoords(point);
    setGeoStatus("loading");
    try {
      const data = await api("GET", `/api/geo/reverse?lat=${point.lat}&lng=${point.lng}`);
      if (data.found) {
        setForm((f) => ({
          ...f,
          province: data.province || f.province,
          city: data.city || f.city,
          neighborhood: data.neighborhood ?? f.neighborhood,
          addressLine: data.addressLine || f.addressLine,
          plaque: data.plaque || f.plaque,
          postalCode: data.postalCode || f.postalCode,
        }));
        setGeoStatus("found");
      } else {
        setGeoStatus("notfound");
      }
    } catch {
      setGeoStatus("notfound");
    }
  }

  async function submit(e) {
    e.preventDefault();
    setFormError("");
    setBusy(true);
    try {
      const payload = {
        ...form,
        recipientPhone: normalizeMobile(form.recipientPhone) || form.recipientPhone,
        postalCode: toEnglishDigits(form.postalCode),
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
      };
      const data = isEdit
        ? await api("PUT", `/api/addresses/${initialAddress.id}`, payload)
        : await api("POST", "/api/addresses", payload);
      notify.success("آدرس ذخیره شد.");
      onSaved?.(data.address);
    } catch (err) {
      if (err.fields && Object.keys(err.fields).length) setErrors(err.fields);
      else setFormError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      {/* انتخاب روش ثبت آدرس */}
      <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
        {MODES.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => selectMode(key)}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-bold transition ${
              mode === key ? "bg-white text-green-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {mode === "map" && (
        <div className="space-y-2">
          {locationConsent === "idle" && (
            <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-green-300 bg-green-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-6 text-green-900">
                برای راحتی ثبت آدرس، اجازه می‌دهید محدوده‌ی موقعیت مکانی فعلی‌تان روی نقشه نشان داده شود؟ بعد از آن
                می‌توانید پین را دقیق‌تر جابه‌جا کنید.
              </p>
              <div className="flex w-full shrink-0 gap-2 sm:w-auto">
                <button
                  type="button"
                  onClick={() => setLocationConsent("asked")}
                  className={cn(buttonVariants({ size: "sm" }), "flex-1 sm:flex-none")}
                >
                  <FaCrosshairs size={12} />
                  اجازه بده و نشان بده
                </button>
                <button
                  type="button"
                  onClick={() => setLocationConsent("skipped")}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "flex-1 sm:flex-none")}
                >
                  خودم روی نقشه انتخاب می‌کنم
                </button>
              </div>
            </div>
          )}

          <MapPicker
            value={coords}
            onChange={handleMapChange}
            onLocateStart={() => setGeoStatus("loading")}
            autoLocate={locationConsent === "asked"}
            onLocateEnd={(success) => setLocationConsent(success ? "granted" : "denied")}
          />

          {locationConsent === "denied" && (
            <p className="text-xs text-amber-700">
              دسترسی به موقعیت مکانی داده نشد یا پیدا نشد؛ می‌توانید روی نقشه لمس کنید یا دوباره روی «موقعیت من» بزنید.
            </p>
          )}
          {geoStatus === "loading" && (
            <p className="flex items-center gap-1.5 text-xs text-slate-500">
              <Spinner className="text-green-700" /> در حال دریافت آدرس از روی نقشه...
            </p>
          )}
          {geoStatus === "found" && (
            <p className="text-xs text-green-700">
              فیلدهای زیر با موقعیت انتخابی پر شدند؛ در صورت نیاز آن‌ها را اصلاح کنید.
            </p>
          )}
          {geoStatus === "notfound" && (
            <p className="text-xs text-amber-700">
              نتوانستیم از این موقعیت آدرس دقیقی استخراج کنیم؛ لطفاً فیلدهای زیر را دستی تکمیل کنید.
            </p>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="عنوان آدرس" htmlFor="label" hint="مثال: خانه، محل کار" className="sm:col-span-2">
          <input
            id="label"
            value={form.label}
            onChange={(e) => setField("label", e.target.value)}
            maxLength={30}
            className={inputCls(false)}
          />
        </Field>

        <Field label="نام تحویل‌گیرنده" htmlFor="recipientName" error={errors.recipientName} required>
          <input
            id="recipientName"
            value={form.recipientName}
            onChange={(e) => setField("recipientName", e.target.value)}
            className={inputCls(Boolean(errors.recipientName))}
          />
        </Field>

        <Field label="موبایل تحویل‌گیرنده" htmlFor="recipientPhone" error={errors.recipientPhone} required>
          <input
            id="recipientPhone"
            dir="ltr"
            inputMode="numeric"
            value={form.recipientPhone}
            onChange={(e) => setField("recipientPhone", toEnglishDigits(e.target.value).replace(/[^\d+]/g, ""))}
            className={`${inputCls(Boolean(errors.recipientPhone))} text-left`}
          />
        </Field>

        <ProvinceSelect
          value={form.province}
          onChange={(v) => {
            setField("province", v);
            setField("city", "");
          }}
          error={errors.province}
        />
        <CitySelect province={form.province} value={form.city} onChange={(v) => setField("city", v)} error={errors.city} />

        <Field label="محله" htmlFor="neighborhood" className="sm:col-span-2">
          <input
            id="neighborhood"
            value={form.neighborhood}
            onChange={(e) => setField("neighborhood", e.target.value)}
            maxLength={80}
            className={inputCls(false)}
          />
        </Field>

        <Field label="آدرس کامل" htmlFor="addressLine" error={errors.addressLine} required className="sm:col-span-2">
          <textarea
            id="addressLine"
            value={form.addressLine}
            onChange={(e) => setField("addressLine", e.target.value)}
            rows={2}
            maxLength={300}
            placeholder="مثال: شهرک انقلاب، بل خرم رودی، خ. ابراهیمی"
            className={`${inputCls(Boolean(errors.addressLine))} h-auto py-3`}
          />
        </Field>

        <Field label="پلاک" htmlFor="plaque">
          <input id="plaque" value={form.plaque} onChange={(e) => setField("plaque", e.target.value)} maxLength={10} className={inputCls(false)} />
        </Field>
        <Field label="واحد" htmlFor="unit">
          <input id="unit" value={form.unit} onChange={(e) => setField("unit", e.target.value)} maxLength={10} className={inputCls(false)} />
        </Field>

        <Field label="کد پستی" htmlFor="postalCode" error={errors.postalCode} required className="sm:col-span-2">
          <input
            id="postalCode"
            dir="ltr"
            inputMode="numeric"
            value={form.postalCode}
            onChange={(e) => setField("postalCode", toEnglishDigits(e.target.value).replace(/\D/g, "").slice(0, 10))}
            className={`${inputCls(Boolean(errors.postalCode))} text-left tracking-wider`}
          />
        </Field>

        {showDefaultToggle && (
          <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) => setField("isDefault", e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-green-700 focus:ring-green-600/30"
            />
            تنظیم به‌عنوان آدرس پیش‌فرض
          </label>
        )}
      </div>


      <div className="flex flex-col-reverse gap-3 sm:flex-row">
        {onCancel && (
          <button type="button" onClick={onCancel} className={cn(btnSecondary, "sm:flex-1")}>
            انصراف
          </button>
        )}
        <button type="submit" disabled={busy} className={cn(btnPrimary, "sm:flex-1")}>
          {busy && <Spinner />}
          {isEdit ? "ذخیره تغییرات" : "افزودن آدرس"}
        </button>
      </div>
    </form>
  );
}
