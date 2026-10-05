"use client";

import { useState } from "react";
import { FaArrowDown, FaArrowUp, FaEdit, FaImage, FaPlus, FaTrash } from "react-icons/fa";
import { ActiveBadge, Card, PageHeader } from "@/components/admin/ui";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { Field, Spinner, btnPrimary, btnSecondary, inputCls } from "@/components/ui/form";
import { MAX_BANNERS } from "@/lib/admin-constants";
import { ApiClientError, api } from "@/lib/api-client";
import { formatNumber } from "@/lib/format";
import { notify, useToastOnChange } from "@/lib/toast";
import { cn } from "@/lib/utils";

const EMPTY = { id: null, title: "", imageUrl: "", linkUrl: "", isActive: true };

// پیشنهاد مقصد لینک (می‌شه هر مسیر یا آدرس https دیگه‌ای هم نوشت)
const LINK_SUGGESTIONS = [
  { value: "/products", label: "همه‌ی محصولات" },
  { value: "/products?discounted=1", label: "کالاهای شگفت‌انگیز" },
];

async function uploadBannerImage(file) {
  const body = new FormData();
  body.append("image", file);
  let res;
  try {
    res = await fetch("/api/admin/banners/upload", { method: "POST", body, cache: "no-store" });
  } catch {
    throw new ApiClientError("ارتباط با سرور برقرار نشد.");
  }
  let data = null;
  try {
    data = await res.json();
  } catch {}
  if (!res.ok || !data?.ok) throw new ApiClientError(data?.error || "آپلود عکس با خطا مواجه شد.");
  return data;
}

export default function BannersAdmin({ initial }) {
  const confirm = useConfirm();
  const [banners, setBanners] = useState(initial);
  const [form, setForm] = useState(null); // null یعنی فرم بسته‌ست
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  useToastOnChange(error);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [movingId, setMovingId] = useState(null);

  const atLimit = banners.length >= MAX_BANNERS;

  function setField(name, value) {
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((e) => (e[name] ? { ...e, [name]: undefined } : e));
  }

  function openCreate() {
    setForm({ ...EMPTY });
    setErrors({});
    setError("");
  }

  function openEdit(b) {
    setForm({ id: b.id, title: b.title, imageUrl: b.imageUrl, linkUrl: b.linkUrl ?? "", isActive: b.isActive });
    setErrors({});
    setError("");
  }

  async function handleImagePick(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // امکان انتخاب دوباره‌ی همان فایل
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const data = await uploadBannerImage(file);
      setField("imageUrl", data.imageUrl);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setError("");
    const payload = {
      title: form.title,
      imageUrl: form.imageUrl,
      linkUrl: form.linkUrl || null,
      isActive: form.isActive,
    };
    try {
      if (form.id) {
        const data = await api("PATCH", `/api/admin/banners/${form.id}`, payload);
        setBanners((list) => list.map((b) => (b.id === form.id ? data.banner : b)));
        notify.success("بنر ذخیره شد.");
      } else {
        const data = await api("POST", "/api/admin/banners", payload);
        setBanners((list) => [...list, data.banner]);
        notify.success("بنر جدید اضافه شد.");
      }
      setForm(null);
    } catch (err) {
      if (err.fields && Object.keys(err.fields).length) setErrors(err.fields);
      else setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleToggle(b) {
    setError("");
    try {
      const data = await api("PATCH", `/api/admin/banners/${b.id}`, { isActive: !b.isActive });
      setBanners((list) => list.map((x) => (x.id === b.id ? data.banner : x)));
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(b) {
    if (!(await confirm({ title: "حذف بنر", description: `بنر «${b.title}» حذف شود؟`, confirmText: "حذف" }))) return;
    setError("");
    try {
      await api("DELETE", `/api/admin/banners/${b.id}`);
      setBanners((list) => list.filter((x) => x.id !== b.id));
      if (form?.id === b.id) setForm(null);
      notify.success("بنر حذف شد.");
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleMove(index, delta) {
    const target = index + delta;
    if (target < 0 || target >= banners.length) return;
    const next = [...banners];
    [next[index], next[target]] = [next[target], next[index]];
    const previous = banners;
    setBanners(next); // خوش‌بینانه؛ اگه سرور رد کرد برمی‌گرده
    setMovingId(next[target].id);
    setError("");
    try {
      await api("POST", "/api/admin/banners/reorder", { ids: next.map((b) => b.id) });
    } catch (err) {
      setBanners(previous);
      setError(err.message);
    } finally {
      setMovingId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="بنرهای صفحه‌ی اصلی"
        description={`اسلایدر بالای صفحه‌ی اصلی — ${formatNumber(banners.length)} از ${formatNumber(MAX_BANNERS)} بنر. اگر هیچ بنر فعالی نباشد، بنر پیش‌فرض سایت نمایش داده می‌شود.`}
      >
        {!form && (
          <button type="button" onClick={openCreate} disabled={atLimit} className={cn(btnPrimary, "w-auto px-5")}>
            <FaPlus size={13} />
            بنر جدید
          </button>
        )}
      </PageHeader>

      {form && (
        <Card title={form.id ? "ویرایش بنر" : "بنر جدید"} className="mb-4">
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <Field
              label="عکس بنر"
              htmlFor="bannerImage"
              error={errors.imageUrl}
              hint="اندازه‌ی پیشنهادی ۱۶۰۰×۵۶۰ پیکسل (نسبت ۲۰ به ۷)، JPG یا PNG یا WebP، حداکثر ۴ مگابایت. متن و دکمه‌ی بنر را داخل خود عکس طراحی کنید."
              required
            >
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex aspect-20/7 w-full max-w-md items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
                  {form.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={form.imageUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex items-center gap-2 text-xs text-slate-400">
                      <FaImage size={14} /> عکسی انتخاب نشده
                    </span>
                  )}
                </div>
                <label className={cn(btnSecondary, "w-auto cursor-pointer px-4", uploading && "pointer-events-none opacity-60")}>
                  {uploading ? <Spinner /> : form.imageUrl ? "تغییر عکس" : "انتخاب عکس"}
                  <input
                    id="bannerImage"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleImagePick}
                    disabled={uploading}
                  />
                </label>
              </div>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="عنوان بنر" htmlFor="bannerTitle" error={errors.title} hint="برای نام‌گذاری در پنل و توضیح عکس برای کاربران نابینا" required>
                <input
                  id="bannerTitle"
                  value={form.title}
                  onChange={(e) => setField("title", e.target.value)}
                  placeholder="مثلاً جشنواره‌ی لبنیات"
                  className={inputCls(Boolean(errors.title))}
                />
              </Field>
              <Field label="لینک مقصد (اختیاری)" htmlFor="bannerLink" error={errors.linkUrl} hint="با کلیک روی بنر، کاربر به این آدرس می‌رود">
                <input
                  id="bannerLink"
                  dir="ltr"
                  list="bannerLinkSuggestions"
                  value={form.linkUrl}
                  onChange={(e) => setField("linkUrl", e.target.value)}
                  placeholder="/products?discounted=1"
                  className={inputCls(Boolean(errors.linkUrl))}
                />
                <datalist id="bannerLinkSuggestions">
                  {LINK_SUGGESTIONS.map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.label}
                    </option>
                  ))}
                </datalist>
              </Field>
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-700">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setField("isActive", e.target.checked)} />
              نمایش در صفحه‌ی اصلی
            </label>

            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" disabled={busy || uploading} className={cn(btnPrimary, "w-auto px-6")}>
                {busy ? <Spinner /> : "ذخیره"}
              </button>
              <button type="button" onClick={() => setForm(null)} className={cn(btnSecondary, "w-auto px-5")}>
                انصراف
              </button>
            </div>
          </form>
        </Card>
      )}

      {banners.length === 0 && !form ? (
        <Card>
          <p className="py-10 text-center text-xs leading-7 text-slate-400">
            هنوز بنری ثبت نشده و بنر پیش‌فرض سایت نمایش داده می‌شود.
            <br />
            با «بنر جدید» اولین بنر را اضافه کنید.
          </p>
        </Card>
      ) : (
        <ul className="space-y-3">
          {banners.map((b, i) => (
            <li key={b.id} className="animate-fade-up">
              <Card className="flex flex-wrap items-center gap-4 p-3 sm:flex-nowrap">
                <div className="aspect-20/7 w-full shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:w-56">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={b.imageUrl} alt={b.title} loading="lazy" decoding="async" className={cn("h-full w-full object-cover", !b.isActive && "opacity-50 grayscale")} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-800">{b.title}</p>
                  <p dir="ltr" className="mt-1 truncate text-start text-xs text-slate-500">
                    {b.linkUrl || "بدون لینک"}
                  </p>
                  <div className="mt-2">
                    <ActiveBadge active={b.isActive} on="نمایش داده می‌شود" off="مخفی" />
                  </div>
                </div>

                <div className="flex items-center gap-3 text-slate-500">
                  <button
                    type="button"
                    onClick={() => handleMove(i, -1)}
                    disabled={i === 0 || movingId !== null}
                    aria-label={`جابه‌جایی ${b.title} به بالا`}
                    className="hover:text-green-700 disabled:opacity-30"
                  >
                    <FaArrowUp size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMove(i, 1)}
                    disabled={i === banners.length - 1 || movingId !== null}
                    aria-label={`جابه‌جایی ${b.title} به پایین`}
                    className="hover:text-green-700 disabled:opacity-30"
                  >
                    <FaArrowDown size={13} />
                  </button>
                  <button type="button" onClick={() => handleToggle(b)} className="text-xs font-bold hover:text-green-700">
                    {b.isActive ? "مخفی‌کردن" : "نمایش"}
                  </button>
                  <button type="button" onClick={() => openEdit(b)} aria-label={`ویرایش ${b.title}`} className="hover:text-green-700">
                    <FaEdit size={14} />
                  </button>
                  <button type="button" onClick={() => handleDelete(b)} aria-label={`حذف ${b.title}`} className="hover:text-red-600">
                    <FaTrash size={14} />
                  </button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
