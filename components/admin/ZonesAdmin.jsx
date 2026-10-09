"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Select } from "@/components/ui/select";
import { getCities, getProvincesList } from "@code-plate/iran-cities";
import { FaEdit, FaPlus, FaPowerOff, FaTimes, FaTrash } from "react-icons/fa";
import { Field, Spinner, btnPrimary, btnSecondary, inputCls } from "@/components/ui/form";
import ListFooter from "@/components/admin/ListFooter";
import { useInfiniteList } from "@/components/admin/useInfiniteList";
import { ActiveBadge, Card, EmptyRow, PageHeader, theadRowCls, trCls } from "@/components/admin/ui";
import { api } from "@/lib/api-client";
import { formatNumber, formatToman } from "@/lib/format";
import { notify, useToastOnChange } from "@/lib/toast";
import { useConfirm } from "@/components/providers/ConfirmProvider";

const PROVINCES = getProvincesList().sort((a, b) => a.fa.localeCompare(b.fa, "fa"));

const EMPTY = {
  id: null,
  name: "",
  province: "",
  cities: [],
  fee: "0",
  freeOver: "",
  deliveryTime: "",
  sortOrder: "0",
  isActive: true,
};

/** بدنه‌ی درخواست API از روی فرم یا از روی یک ردیف لیست */
function toPayload(z) {
  return {
    name: z.name,
    province: z.province || null,
    cities: z.cities,
    fee: z.fee,
    freeOver: z.freeOver === "" || z.freeOver == null ? null : z.freeOver,
    deliveryTime: z.deliveryTime || null,
    isActive: z.isActive,
    sortOrder: z.sortOrder === "" ? 0 : z.sortOrder,
  };
}

function coverageText(z) {
  if (!z.province) return "کل کشور";
  if (!z.cities.length) return `${z.province} — همه‌ی شهرها`;
  const shown = z.cities.slice(0, 3).join("، ");
  return `${z.province} — ${shown}${z.cities.length > 3 ? ` و ${formatNumber(z.cities.length - 3)} شهر دیگر` : ""}`;
}

export default function ZonesAdmin({ initial }) {
  const confirm = useConfirm();
  const list = useInfiniteList({ endpoint: "/api/admin/zones", itemsKey: "zones", initial });
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  useToastOnChange(formError); // پیام خطا به‌صورت toast نشون داده می‌شه
  const [error, setError] = useState("");
  useToastOnChange(error); // پیام خطا به‌صورت toast نشون داده می‌شه
  const [busy, setBusy] = useState(false);

  const cityOptions = useMemo(() => {
    const found = PROVINCES.find((p) => p.fa === form?.province);
    return found ? getCities(found.en).sort((a, b) => a.fa.localeCompare(b.fa, "fa")) : [];
  }, [form?.province]);

  function setField(name, value) {
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((e) => (e[name] ? { ...e, [name]: undefined } : e));
  }

  function openCreate() {
    setForm({ ...EMPTY, sortOrder: String(list.total + 1) });
    setErrors({});
    setFormError("");
  }

  function openEdit(z) {
    setForm({
      id: z.id,
      name: z.name,
      province: z.province ?? "",
      cities: z.cities,
      fee: String(z.fee),
      freeOver: z.freeOver == null ? "" : String(z.freeOver),
      deliveryTime: z.deliveryTime ?? "",
      sortOrder: String(z.sortOrder),
      isActive: z.isActive,
    });
    setErrors({});
    setFormError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setFormError("");
    try {
      if (form.id) await api("PATCH", `/api/admin/zones/${form.id}`, toPayload(form));
      else await api("POST", "/api/admin/zones", toPayload(form));
      notify.success("اطلاعات محدوده ذخیره شد.");
      setForm(null);
      list.reload();
    } catch (err) {
      if (err.fields && Object.keys(err.fields).length) setErrors(err.fields);
      else setFormError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(z) {
    setError("");
    try {
      const data = await api("PATCH", `/api/admin/zones/${z.id}`, { ...toPayload(z), isActive: !z.isActive });
      notify.success("وضعیت محدوده تغییر کرد.");
      list.patchItem(z.id, data.zone);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(z) {
    if (!(await confirm({ title: "حذف محدوده", description: `محدوده‌ی «${z.name}» حذف شود؟`, confirmText: "حذف" }))) return;
    setError("");
    try {
      await api("DELETE", `/api/admin/zones/${z.id}`);
      notify.success("محدوده حذف شد.");
      list.removeItem(z.id);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <PageHeader
        title="محدوده‌های ارسال"
        description={`هزینه و زمان تحویل هر استان یا شهر — ${formatNumber(list.total)} محدوده`}
      >
        {!form && (
          <button type="button" onClick={openCreate} className={cn(btnPrimary, "h-10 w-auto px-4")}>
            <FaPlus size={14} />
            محدوده‌ی جدید
          </button>
        )}
      </PageHeader>


      {form && (
        <Card title={form.id ? "ویرایش محدوده" : "محدوده‌ی جدید"} className="mb-4">
          <form onSubmit={submit} noValidate className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="نام محدوده" htmlFor="zName" error={errors.name} required>
                <input id="zName" value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="مثلاً تهران" className={inputCls(Boolean(errors.name))} />
              </Field>
              <Field label="زمان تحویل" htmlFor="zTime" error={errors.deliveryTime} hint="مثلاً «۲ تا ۷ ساعت کاری»">
                <input id="zTime" value={form.deliveryTime} onChange={(e) => setField("deliveryTime", e.target.value)} className={inputCls(Boolean(errors.deliveryTime))} />
              </Field>
              <Field label="استان" htmlFor="zProvince" error={errors.province} hint="خالی = کل کشور">
                <Select
                  id="zProvince"
                  value={form.province}
                  onChange={(e) => setForm((f) => ({ ...f, province: e.target.value, cities: [] }))}
                  className={inputCls(Boolean(errors.province))}
                >
                  <option value="">کل کشور</option>
                  {PROVINCES.map((p) => (
                    <option key={p.en} value={p.fa}>
                      {p.fa}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="افزودن شهر" htmlFor="zCity" error={errors.cities} hint="اگر شهری انتخاب نشود، همه‌ی شهرهای استان شامل می‌شوند">
                <Select
                  id="zCity"
                  value=""
                  disabled={!form.province}
                  onChange={(e) => {
                    const city = e.target.value;
                    if (city && !form.cities.includes(city)) setField("cities", [...form.cities, city]);
                  }}
                  className={inputCls(Boolean(errors.cities))}
                >
                  <option value="">{form.province ? "انتخاب شهر…" : "ابتدا استان را انتخاب کنید"}</option>
                  {cityOptions
                    .filter((c) => !form.cities.includes(c.fa))
                    .map((c) => (
                      <option key={c.en} value={c.fa}>
                        {c.fa}
                      </option>
                    ))}
                </Select>
              </Field>
            </div>

            {form.cities.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {form.cities.map((c) => (
                  <span key={c} className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs text-green-800">
                    {c}
                    <button type="button" aria-label={`حذف ${c}`} onClick={() => setField("cities", form.cities.filter((x) => x !== c))}>
                      <FaTimes size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="هزینه‌ی ارسال (تومان)" htmlFor="zFee" error={errors.fee} hint="صفر = رایگان">
                <input id="zFee" type="number" min="0" value={form.fee} onChange={(e) => setField("fee", e.target.value)} className={inputCls(Boolean(errors.fee))} />
              </Field>
              <Field label="ارسال رایگان بالای (تومان)" htmlFor="zFree" error={errors.freeOver} hint="خالی = بدون ارسال رایگان">
                <input id="zFree" type="number" min="1" value={form.freeOver} onChange={(e) => setField("freeOver", e.target.value)} className={inputCls(Boolean(errors.freeOver))} />
              </Field>
              <Field label="ترتیب نمایش" htmlFor="zSort" error={errors.sortOrder}>
                <input id="zSort" type="number" value={form.sortOrder} onChange={(e) => setField("sortOrder", e.target.value)} className={inputCls(Boolean(errors.sortOrder))} />
              </Field>
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-700">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setField("isActive", e.target.checked)} />
              محدوده فعال باشد
            </label>

            <div className="flex flex-wrap gap-2">
              <button type="submit" disabled={busy} className={cn(btnPrimary, "w-auto px-6")}>
                {busy && <Spinner />}
                {form.id ? "ذخیره‌ی تغییرات" : "افزودن محدوده"}
              </button>
              <button type="button" onClick={() => setForm(null)} className={cn(btnSecondary, "px-6")}>
                انصراف
              </button>
            </div>
          </form>
        </Card>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-start text-xs">
            <thead>
              <tr className={theadRowCls}>
                <th className="py-2.5 ps-3 pe-3 font-medium">نام</th>
                <th className="py-2.5 pe-3 font-medium">پوشش</th>
                <th className="py-2.5 pe-3 font-medium">هزینه</th>
                <th className="py-2.5 pe-3 font-medium">ارسال رایگان</th>
                <th className="py-2.5 pe-3 font-medium">زمان تحویل</th>
                <th className="py-2.5 pe-3 font-medium">وضعیت</th>
                <th className="py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {list.items.map((z) => (
                <tr key={z.id} className={trCls}>
                  <td className="py-2.5 ps-3 pe-3 font-medium text-slate-800">{z.name}</td>
                  <td className="py-2.5 pe-3 text-slate-600">{coverageText(z)}</td>
                  <td className="py-2.5 pe-3 text-slate-700">{z.fee === 0 ? "رایگان" : formatToman(z.fee)}</td>
                  <td className="py-2.5 pe-3 text-slate-600">{z.freeOver ? `بالای ${formatToman(z.freeOver)}` : "—"}</td>
                  <td className="py-2.5 pe-3 text-slate-600">{z.deliveryTime ?? "—"}</td>
                  <td className="py-2.5 pe-3">
                    <ActiveBadge active={z.isActive} />
                  </td>
                  <td className="py-2.5">
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={() => openEdit(z)} aria-label={`ویرایش ${z.name}`} className="text-slate-500 hover:text-green-700">
                        <FaEdit size={14} />
                      </button>
                      <button type="button" onClick={() => toggleActive(z)} aria-label={z.isActive ? "غیرفعال‌کردن" : "فعال‌کردن"} className="text-slate-500 hover:text-green-700">
                        <FaPowerOff size={14} />
                      </button>
                      <button type="button" onClick={() => handleDelete(z)} aria-label={`حذف ${z.name}`} className="text-slate-500 hover:text-red-600">
                        <FaTrash size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {list.items.length === 0 && !list.loading && <EmptyRow colSpan={7}>هنوز محدوده‌ای ثبت نشده.</EmptyRow>}
            </tbody>
          </table>
        </div>
        <ListFooter list={list} />
      </Card>
    </div>
  );
}
