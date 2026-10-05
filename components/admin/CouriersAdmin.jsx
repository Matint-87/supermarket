"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { FaCheck, FaEdit, FaPlus, FaPowerOff, FaTimes, FaTrash } from "react-icons/fa";
import { Field, Spinner, btnPrimary, inputCls } from "@/components/ui/form";
import AdminFilters from "@/components/admin/AdminFilters";
import ListFooter from "@/components/admin/ListFooter";
import { useInfiniteList } from "@/components/admin/useInfiniteList";
import { ActiveBadge, Card, EmptyRow, PageHeader, theadRowCls, trCls } from "@/components/admin/ui";
import { api } from "@/lib/api-client";
import { formatNumber } from "@/lib/format";
import { toFaDigits } from "@/lib/phone";
import { notify, useToastOnChange } from "@/lib/toast";
import { useConfirm } from "@/components/providers/ConfirmProvider";

const EMPTY = { name: "", phone: "", vehicle: "", isActive: true };

export default function CouriersAdmin({ filters, initial }) {
  const confirm = useConfirm();
  const list = useInfiniteList({ endpoint: "/api/admin/couriers", itemsKey: "couriers", filters, initial });
  const [error, setError] = useState("");
  useToastOnChange(error); // پیام خطا به‌صورت toast نشون داده می‌شه

  const [createForm, setCreateForm] = useState({ ...EMPTY });
  const [createErrors, setCreateErrors] = useState({});
  const [creating, setCreating] = useState(false);

  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY);
  const [editErrors, setEditErrors] = useState({});
  const [saving, setSaving] = useState(false);

  async function handleCreate(e) {
    e.preventDefault();
    setCreating(true);
    setCreateErrors({});
    setError("");
    try {
      await api("POST", "/api/admin/couriers", { ...createForm, vehicle: createForm.vehicle || null });
      notify.success("پیک جدید اضافه شد.");
      setCreateForm({ ...EMPTY });
      list.reload();
    } catch (err) {
      if (err.fields && Object.keys(err.fields).length) setCreateErrors(err.fields);
      else setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  function startEdit(c) {
    setEditId(c.id);
    setEditForm({ name: c.name, phone: c.phone, vehicle: c.vehicle ?? "", isActive: c.isActive });
    setEditErrors({});
    setError("");
  }

  async function handleSave(id) {
    setSaving(true);
    setEditErrors({});
    setError("");
    try {
      const data = await api("PATCH", `/api/admin/couriers/${id}`, { ...editForm, vehicle: editForm.vehicle || null });
      notify.success("تغییرات پیک ذخیره شد.");
      list.patchItem(id, data.courier);
      setEditId(null);
    } catch (err) {
      if (err.fields && Object.keys(err.fields).length) setEditErrors(err.fields);
      else setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(c) {
    setError("");
    try {
      const data = await api("PATCH", `/api/admin/couriers/${c.id}`, { isActive: !c.isActive });
      notify.success("وضعیت پیک تغییر کرد.");
      list.patchItem(c.id, data.courier);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(c) {
    if (!(await confirm({ title: "حذف پیک", description: `پیک «${c.name}» حذف شود؟`, confirmText: "حذف" }))) return;
    setError("");
    try {
      await api("DELETE", `/api/admin/couriers/${c.id}`);
      notify.success("پیک حذف شد.");
      list.removeItem(c.id);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <PageHeader title="پیک‌ها" description={`پیک‌های تحویل سفارش — ${formatNumber(list.total)} پیک`} />


      <Card title="پیک جدید" className="mb-4">
        <form onSubmit={handleCreate} noValidate className="flex flex-wrap items-start gap-3">
          <Field label="نام پیک" htmlFor="cName" error={createErrors.name} className="min-w-[180px] flex-1">
            <input id="cName" value={createForm.name} onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))} className={inputCls(Boolean(createErrors.name))} />
          </Field>
          <Field label="موبایل" htmlFor="cPhone" error={createErrors.phone} className="w-44">
            <input id="cPhone" dir="ltr" value={createForm.phone} onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))} placeholder="09123456789" className={inputCls(Boolean(createErrors.phone))} />
          </Field>
          <Field label="وسیله‌ی نقلیه" htmlFor="cVehicle" error={createErrors.vehicle} className="w-40">
            <input id="cVehicle" value={createForm.vehicle} onChange={(e) => setCreateForm((f) => ({ ...f, vehicle: e.target.value }))} placeholder="موتور" className={inputCls(Boolean(createErrors.vehicle))} />
          </Field>
          <button type="submit" disabled={creating} className={cn(btnPrimary, "mt-7 w-auto px-5")}>
            {creating ? <Spinner /> : <FaPlus size={14} />}
            افزودن
          </button>
        </form>
      </Card>

      <AdminFilters
        placeholder="نام یا موبایل پیک…"
        selects={[
          {
            name: "status",
            label: "وضعیت",
            options: [
              { value: "active", label: "فعال" },
              { value: "inactive", label: "غیرفعال" },
            ],
          },
        ]}
      />

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-start text-xs">
            <thead>
              <tr className={theadRowCls}>
                <th className="py-2.5 ps-3 pe-3 font-medium">نام</th>
                <th className="py-2.5 pe-3 font-medium">موبایل</th>
                <th className="py-2.5 pe-3 font-medium">وسیله</th>
                <th className="py-2.5 pe-3 font-medium">سفارش‌ها</th>
                <th className="py-2.5 pe-3 font-medium">وضعیت</th>
                <th className="py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {list.items.map((c) =>
                editId === c.id ? (
                  <tr key={c.id} className="border-b border-slate-100 bg-green-50/40 align-top">
                    <td className="py-2 ps-3 pe-3">
                      <input value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} aria-label="نام پیک" className={inputCls(Boolean(editErrors.name))} />
                      {editErrors.name && <p className="mt-1 text-xs text-red-600">{editErrors.name}</p>}
                    </td>
                    <td className="py-2 pe-3">
                      <input dir="ltr" value={editForm.phone} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} aria-label="موبایل" className={inputCls(Boolean(editErrors.phone))} />
                      {editErrors.phone && <p className="mt-1 text-xs text-red-600">{editErrors.phone}</p>}
                    </td>
                    <td className="py-2 pe-3">
                      <input value={editForm.vehicle} onChange={(e) => setEditForm((f) => ({ ...f, vehicle: e.target.value }))} aria-label="وسیله" className={inputCls(Boolean(editErrors.vehicle))} />
                    </td>
                    <td className="py-4 pe-3 text-slate-500">{formatNumber(c.orderCount)}</td>
                    <td className="py-4 pe-3">
                      <label className="flex items-center gap-2 text-slate-700">
                        <input type="checkbox" checked={editForm.isActive} onChange={(e) => setEditForm((f) => ({ ...f, isActive: e.target.checked }))} />
                        فعال
                      </label>
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <button type="button" onClick={() => handleSave(c.id)} disabled={saving} aria-label="ذخیره" className="text-green-700 hover:text-green-800 disabled:opacity-50">
                          {saving ? <Spinner /> : <span className="flex items-center gap-1 text-xs font-bold"><FaCheck size={11} /> ذخیره</span>}
                        </button>
                        <button type="button" onClick={() => setEditId(null)} aria-label="انصراف" className="text-slate-500 hover:text-slate-700">
                          <span className="flex items-center gap-1 text-xs font-bold"><FaTimes size={11} /> انصراف</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={c.id} className={trCls}>
                    <td className="py-2.5 ps-3 pe-3 font-medium text-slate-800">{c.name}</td>
                    <td className="py-2.5 pe-3 text-slate-600" dir="ltr">
                      <span className="block text-end">{toFaDigits(c.phone)}</span>
                    </td>
                    <td className="py-2.5 pe-3 text-slate-600">{c.vehicle ?? "—"}</td>
                    <td className="py-2.5 pe-3 text-slate-600">{formatNumber(c.orderCount)}</td>
                    <td className="py-2.5 pe-3">
                      <ActiveBadge active={c.isActive} />
                    </td>
                    <td className="py-2.5">
                      <div className="flex items-center gap-3">
                        <button type="button" onClick={() => startEdit(c)} aria-label={`ویرایش ${c.name}`} className="text-slate-500 hover:text-green-700">
                          <FaEdit size={14} />
                        </button>
                        <button type="button" onClick={() => toggleActive(c)} aria-label={c.isActive ? "غیرفعال‌کردن" : "فعال‌کردن"} className="text-slate-500 hover:text-green-700">
                          <FaPowerOff size={14} />
                        </button>
                        <button type="button" onClick={() => handleDelete(c)} aria-label={`حذف ${c.name}`} className="text-slate-500 hover:text-red-600">
                          <FaTrash size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ),
              )}
              {list.items.length === 0 && !list.loading && <EmptyRow colSpan={6}>پیکی پیدا نشد.</EmptyRow>}
            </tbody>
          </table>
        </div>
        <ListFooter list={list} />
      </Card>
      <p className="mt-3 text-xs text-slate-400">
        پیک را از صفحه‌ی جزئیات هر سفارش تعیین کنید. <Link href="/admin/orders" className="text-green-700 hover:underline">رفتن به سفارش‌ها</Link>
      </p>
    </div>
  );
}
