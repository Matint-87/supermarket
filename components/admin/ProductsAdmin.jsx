"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Select } from "@/components/ui/select";
import Link from "next/link";
import { FaEdit, FaPlus, FaTrash } from "react-icons/fa";
import { api, ApiClientError } from "@/lib/api-client";
import { Field, Spinner, btnPrimary, btnSecondary, inputCls } from "@/components/ui/form";
import { PRODUCT_UNITS, formatUnitAmount } from "@/lib/product-constants";
import AdminFilters from "@/components/admin/AdminFilters";
import ListFooter from "@/components/admin/ListFooter";
import { useInfiniteList } from "@/components/admin/useInfiniteList";
import { ActiveBadge, Card, EmptyRow, PageHeader, theadRowCls, trCls } from "@/components/admin/ui";
import { LOW_STOCK_THRESHOLD } from "@/lib/admin-constants";
import { formatNumber } from "@/lib/format";
import { notify, useToastOnChange } from "@/lib/toast";
import { useConfirm } from "@/components/providers/ConfirmProvider";

const EMPTY_PRODUCT = {
  id: null,
  categoryId: "",
  brandId: "",
  name: "",
  description: "",
  unit: "PIECE",
  amount: "1",
  price: "",
  discountPercent: "0",
  stock: "0",
  imageUrl: "",
  isActive: true,
};

async function uploadProductImage(file) {
  const body = new FormData();
  body.append("image", file);
  let res;
  try {
    res = await fetch("/api/products/upload", { method: "POST", body, cache: "no-store" });
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

function formatToman(value) {
  return `${Number(value).toLocaleString("fa-IR")} تومان`;
}

export default function ProductsAdmin({ brands = [], categories, filters, initial }) {
  const confirm = useConfirm();
  // لیست محصولات: ۱۰ تای اول از سرور، بقیه ۱۰تا۱۰تا با اسکرول
  const list = useInfiniteList({ endpoint: "/api/admin/products", itemsKey: "products", filters, initial });
  const [actionError, setActionError] = useState("");
  useToastOnChange(actionError); // پیام خطا به‌صورت toast نشون داده می‌شه

  // ───────────── محصولات ─────────────
  const [form, setForm] = useState(null); // null یعنی فرم بسته‌ست
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  useToastOnChange(formError); // پیام خطا به‌صورت toast نشون داده می‌شه
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  function setField(name, value) {
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((e) => (e[name] ? { ...e, [name]: undefined } : e));
  }

  function openCreate() {
    setForm({ ...EMPTY_PRODUCT, categoryId: categories[0]?.id ?? "" });
    setErrors({});
    setFormError("");
  }

  function openEdit(p) {
    setForm({
      id: p.id,
      categoryId: p.category?.id ?? "",
      brandId: p.brand?.id ?? "",
      name: p.name,
      description: p.description ?? "",
      unit: p.unit,
      amount: String(p.amount),
      price: String(p.price),
      discountPercent: String(p.discountPercent),
      stock: String(p.stock),
      imageUrl: p.imageUrl ?? "",
      isActive: p.isActive,
    });
    setErrors({});
    setFormError("");
  }

  async function handleImagePick(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setFormError("");
    try {
      const data = await uploadProductImage(file);
      setField("imageUrl", data.imageUrl);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function submitProduct(e) {
    e.preventDefault();
    setBusy(true);
    setFormError("");
    const payload = {
      categoryId: form.categoryId,
      brandId: form.brandId || null,
      name: form.name,
      description: form.description || null,
      unit: form.unit,
      amount: form.amount,
      price: form.price,
      discountPercent: form.discountPercent,
      stock: form.stock,
      imageUrl: form.imageUrl || null,
      isActive: form.isActive,
    };
    try {
      if (form.id) {
        const data = await api("PATCH", `/api/products/${form.id}`, payload);
        notify.success("تغییرات محصول ذخیره شد.");
        list.patchItem(form.id, data.product); // ویرایش داخل همون لیستِ لودشده، بدون ریست اسکرول
      } else {
        await api("POST", "/api/products", payload);
        notify.success("محصول جدید اضافه شد.");
        list.reload(); // محصول جدید بالای لیست (جدیدترین اول) می‌آد
      }
      setForm(null);
    } catch (err) {
      if (err.fields && Object.keys(err.fields).length) setErrors(err.fields);
      else setFormError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteProduct(p) {
    if (!(await confirm({ title: "حذف محصول", description: `محصول «${p.name}» حذف شود؟`, confirmText: "حذف" }))) return;
    setActionError("");
    try {
      await api("DELETE", `/api/products/${p.id}`);
      notify.success("محصول حذف شد.");
      list.removeItem(p.id);
    } catch (err) {
      setActionError(err.message);
    }
  }

  async function toggleActive(p) {
    setActionError("");
    try {
      const data = await api("PATCH", `/api/products/${p.id}`, { isActive: !p.isActive });
      notify.success("وضعیت محصول تغییر کرد.");
      list.patchItem(p.id, data.product);
    } catch (err) {
      setActionError(err.message);
    }
  }

  return (
    <div>
      <PageHeader
        title="محصولات"
        description={`افزودن، ویرایش و حذف محصولات فروشگاه — ${formatNumber(list.total)} محصول`}
      >
        <Link href="/admin/categories" className={cn(btnSecondary, "h-10 px-4 text-xs")}>
          مدیریت دسته‌بندی‌ها
        </Link>
        {!form && (
          <button type="button" onClick={openCreate} className={cn(btnPrimary, "h-10 w-auto px-4")}>
            <FaPlus size={14} />
            محصول جدید
          </button>
        )}
      </PageHeader>

      <AdminFilters
        placeholder="نام محصول…"
        selects={[
          { name: "categoryId", label: "دسته", options: categories.map((c) => ({ value: c.id, label: c.name })) },
          {
            name: "status",
            label: "وضعیت",
            options: [
              { value: "active", label: "فعال" },
              { value: "inactive", label: "غیرفعال" },
              { value: "low", label: "کم‌موجود" },
              { value: "out", label: "ناموجود" },
            ],
          },
        ]}
      />


      <Card>
        {form && (
          <form onSubmit={submitProduct} noValidate className="mb-6 space-y-4 rounded-2xl border border-slate-200/70 bg-slate-50 p-4">

            <div className="flex items-center gap-4">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
                {form.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.imageUrl} alt="" className="h-full w-full object-contain" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[11px] text-slate-400">
                    بدون عکس
                  </div>
                )}
              </div>
              <label className={cn(btnSecondary, "w-auto cursor-pointer px-4")}>
                {uploading ? <Spinner /> : "انتخاب عکس"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleImagePick}
                  disabled={uploading}
                />
              </label>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="دسته‌بندی" htmlFor="categoryId" error={errors.categoryId} required>
                <Select
                  id="categoryId"
                  value={form.categoryId}
                  onChange={(e) => setField("categoryId", e.target.value)}
                  className={inputCls(Boolean(errors.categoryId))}
                >
                  <option value="" disabled>
                    انتخاب کنید
                  </option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="برند" htmlFor="brandId" error={errors.brandId}>
                <Select
                  id="brandId"
                  value={form.brandId}
                  onChange={(e) => setField("brandId", e.target.value)}
                  className={inputCls(Boolean(errors.brandId))}
                >
                  <option value="">بدون برند</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="نام محصول" htmlFor="name" error={errors.name} required>
                <input
                  id="name"
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  className={inputCls(Boolean(errors.name))}
                />
              </Field>

              <Field label="واحد فروش" htmlFor="unit" error={errors.unit} required>
                <Select
                  id="unit"
                  value={form.unit}
                  onChange={(e) => setField("unit", e.target.value)}
                  className={inputCls(Boolean(errors.unit))}
                >
                  {PRODUCT_UNITS.map((u) => (
                    <option key={u.value} value={u.value}>
                      {u.label}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="مقدار به ازای واحد (مثلاً ۸۰ برای ۸۰ گرم)" htmlFor="amount" error={errors.amount} required>
                <input
                  id="amount"
                  type="number"
                  step="any"
                  min="0"
                  value={form.amount}
                  onChange={(e) => setField("amount", e.target.value)}
                  className={inputCls(Boolean(errors.amount))}
                />
              </Field>

              <Field label="قیمت (تومان)" htmlFor="price" error={errors.price} required>
                <input
                  id="price"
                  type="number"
                  min="0"
                  value={form.price}
                  onChange={(e) => setField("price", e.target.value)}
                  className={inputCls(Boolean(errors.price))}
                />
              </Field>

              <Field label="درصد تخفیف" htmlFor="discountPercent" error={errors.discountPercent}>
                <input
                  id="discountPercent"
                  type="number"
                  min="0"
                  max="100"
                  value={form.discountPercent}
                  onChange={(e) => setField("discountPercent", e.target.value)}
                  className={inputCls(Boolean(errors.discountPercent))}
                />
              </Field>

              <Field label="موجودی انبار" htmlFor="stock" error={errors.stock}>
                <input
                  id="stock"
                  type="number"
                  min="0"
                  value={form.stock}
                  onChange={(e) => setField("stock", e.target.value)}
                  className={inputCls(Boolean(errors.stock))}
                />
              </Field>

              <Field label="توضیحات" htmlFor="description" error={errors.description} className="sm:col-span-2">
                <textarea
                  id="description"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setField("description", e.target.value)}
                  className={`${inputCls(Boolean(errors.description))} h-auto py-3`}
                />
              </Field>
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setField("isActive", e.target.checked)}
              />
              نمایش در سایت (فعال)
            </label>

            <div className="flex gap-2">
              <button type="submit" disabled={busy} className={cn(btnPrimary, "w-auto px-6")}>
                {busy ? <Spinner /> : form.id ? "ذخیره تغییرات" : "افزودن محصول"}
              </button>
              <button type="button" onClick={() => setForm(null)} className={cn(btnSecondary, "w-auto px-6")}>
                انصراف
              </button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-start text-xs">
            <thead>
              <tr className={theadRowCls}>
                <th className="py-2.5 ps-3 pe-3 font-medium">محصول</th>
                <th className="py-2.5 pe-3 font-medium">دسته</th>
                <th className="py-2.5 pe-3 font-medium">قیمت</th>
                <th className="py-2.5 pe-3 font-medium">موجودی</th>
                <th className="py-2.5 pe-3 font-medium">وضعیت</th>
                <th className="py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {list.items.map((p) => (
                <tr key={p.id} className={trCls}>
                  <td className="py-2 ps-3 pe-3">
                    <div className="flex items-center gap-2">
                      <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-slate-50 ring-1 ring-slate-200">
                        {p.imageUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.imageUrl} alt="" loading="lazy" decoding="async" className="h-full w-full object-contain" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{p.name}</p>
                        <p className="text-slate-400">{formatUnitAmount(p.amount, p.unit)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-2 pe-3 text-slate-600">{p.category?.name ?? "—"}</td>
                  <td className="py-2 pe-3 text-slate-600">
                    {formatToman(p.finalPrice)}
                    {p.discountPercent > 0 && (
                      <span className="ms-1 text-slate-400 line-through">{formatToman(p.price)}</span>
                    )}
                  </td>
                  <td className="py-2 pe-3">
                    <span
                      className={
                        p.stock === 0
                          ? "font-bold text-red-600"
                          : p.stock <= LOW_STOCK_THRESHOLD
                            ? "font-bold text-amber-600"
                            : "text-slate-600"
                      }
                    >
                      {formatNumber(p.stock)}
                    </span>
                  </td>
                  <td className="py-2 pe-3">
                    <button type="button" onClick={() => toggleActive(p)} title="تغییر وضعیت نمایش">
                      <ActiveBadge active={p.isActive} />
                    </button>
                  </td>
                  <td className="py-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(p)}
                        aria-label="ویرایش"
                        className="text-slate-500 hover:text-green-700"
                      >
                        <FaEdit size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteProduct(p)}
                        aria-label="حذف"
                        className="text-slate-500 hover:text-red-600"
                      >
                        <FaTrash size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {list.items.length === 0 && !list.loading && <EmptyRow colSpan={6}>محصولی پیدا نشد.</EmptyRow>}
            </tbody>
          </table>
        </div>
        <ListFooter list={list} />
      </Card>
    </div>
  );
}
