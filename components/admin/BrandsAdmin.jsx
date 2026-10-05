"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { FaCheck, FaEdit, FaPlus, FaTimes, FaTrash } from "react-icons/fa";
import { Field, Spinner, btnPrimary, inputCls } from "@/components/ui/form";
import ListFooter from "@/components/admin/ListFooter";
import { useInfiniteList } from "@/components/admin/useInfiniteList";
import { ActiveBadge, Card, EmptyRow, PageHeader, theadRowCls, trCls } from "@/components/admin/ui";
import { api } from "@/lib/api-client";
import { formatNumber } from "@/lib/format";
import { notify, useToastOnChange } from "@/lib/toast";
import { useConfirm } from "@/components/providers/ConfirmProvider";

const EMPTY = { name: "", isActive: true };

export default function BrandsAdmin({ initial }) {
  const confirm = useConfirm();
  const list = useInfiniteList({ endpoint: "/api/admin/brands", itemsKey: "brands", initial });
  const [error, setError] = useState("");
  useToastOnChange(error); // پیام خطا به‌صورت toast نشون داده می‌شه

  // افزودن
  const [createForm, setCreateForm] = useState({ ...EMPTY });
  const [createErrors, setCreateErrors] = useState({});
  const [creating, setCreating] = useState(false);

  // ویرایش (هر بار فقط یک ردیف)
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
      await api("POST", "/api/brands", { name: createForm.name, isActive: createForm.isActive });
      notify.success("برند جدید اضافه شد.");
      setCreateForm({ ...EMPTY });
      list.reload(); // لیست بر اساس نام مرتب می‌شه، پس از اول گرفته می‌شه
    } catch (err) {
      if (err.fields && Object.keys(err.fields).length) setCreateErrors(err.fields);
      else setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  function startEdit(b) {
    setEditId(b.id);
    setEditForm({ name: b.name, isActive: b.isActive });
    setEditErrors({});
    setError("");
  }

  async function handleSave(id) {
    setSaving(true);
    setEditErrors({});
    setError("");
    try {
      await api("PATCH", `/api/brands/${id}`, { name: editForm.name, isActive: editForm.isActive });
      notify.success("تغییرات برند ذخیره شد.");
      setEditId(null);
      list.reload();
    } catch (err) {
      if (err.fields && Object.keys(err.fields).length) setEditErrors(err.fields);
      else setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(b) {
    const warn = b.productCount > 0 ? `\nمحصولات این برند (${formatNumber(b.productCount)} عدد) بدون برند می‌شوند.` : "";
    if (!(await confirm({ title: "حذف برند", description: `برند «${b.name}» حذف شود؟${warn}`, confirmText: "حذف" }))) return;
    setError("");
    try {
      await api("DELETE", `/api/brands/${b.id}`);
      notify.success("برند حذف شد.");
      list.removeItem(b.id);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <PageHeader
        title="برندها"
        description={`برند محصولات فروشگاه — ${formatNumber(list.total)} برند`}
      />


      <Card title="برند جدید" className="mb-4">
        <form onSubmit={handleCreate} noValidate className="flex flex-wrap items-start gap-3">
          <Field label="نام برند" htmlFor="newBrand" error={createErrors.name} className="min-w-[200px] flex-1">
            <input
              id="newBrand"
              value={createForm.name}
              onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="مثلاً میهن"
              className={inputCls(Boolean(createErrors.name))}
            />
          </Field>
          <label className="mt-7 flex h-12 items-center gap-2 text-xs text-slate-700">
            <input
              type="checkbox"
              checked={createForm.isActive}
              onChange={(e) => setCreateForm((f) => ({ ...f, isActive: e.target.checked }))}
            />
            فعال
          </label>
          <button type="submit" disabled={creating} className={cn(btnPrimary, "mt-7 w-auto px-5")}>
            {creating ? <Spinner /> : <FaPlus size={14} />}
            افزودن
          </button>
        </form>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-start text-xs">
            <thead>
              <tr className={theadRowCls}>
                <th className="py-2.5 ps-3 pe-3 font-medium">نام</th>
                <th className="py-2.5 pe-3 font-medium">محصولات</th>
                <th className="py-2.5 pe-3 font-medium">وضعیت</th>
                <th className="py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {list.items.map((b) =>
                editId === b.id ? (
                  <tr key={b.id} className="border-b border-slate-100 bg-green-50/40 align-top">
                    <td className="py-2 ps-3 pe-3">
                      <input
                        value={editForm.name}
                        onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                        aria-label="نام برند"
                        className={inputCls(Boolean(editErrors.name))}
                      />
                      {editErrors.name && <p className="mt-1 text-xs text-red-600">{editErrors.name}</p>}
                    </td>
                    <td className="py-4 pe-3 text-slate-500">{formatNumber(b.productCount)}</td>
                    <td className="py-4 pe-3">
                      <label className="flex items-center gap-2 text-slate-700">
                        <input
                          type="checkbox"
                          checked={editForm.isActive}
                          onChange={(e) => setEditForm((f) => ({ ...f, isActive: e.target.checked }))}
                        />
                        فعال
                      </label>
                    </td>
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleSave(b.id)}
                          disabled={saving}
                          aria-label="ذخیره"
                          className="text-green-700 hover:text-green-800 disabled:opacity-50"
                        >
                          {saving ? <Spinner /> : <span className="flex items-center gap-1 text-xs font-bold"><FaCheck size={11} /> ذخیره</span>}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditId(null)}
                          aria-label="انصراف"
                          className="text-slate-500 hover:text-slate-700"
                        >
                          <span className="flex items-center gap-1 text-xs font-bold"><FaTimes size={11} /> انصراف</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={b.id} className={trCls}>
                    <td className="py-2.5 ps-3 pe-3 font-medium text-slate-800">{b.name}</td>
                    <td className="py-2.5 pe-3 text-slate-600">{formatNumber(b.productCount)}</td>
                    <td className="py-2.5 pe-3">
                      <ActiveBadge active={b.isActive} />
                    </td>
                    <td className="py-2.5">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => startEdit(b)}
                          aria-label={`ویرایش ${b.name}`}
                          className="text-slate-500 hover:text-green-700"
                        >
                          <FaEdit size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(b)}
                          aria-label={`حذف ${b.name}`}
                          className="text-slate-500 hover:text-red-600"
                        >
                          <FaTrash size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ),
              )}
              {list.items.length === 0 && !list.loading && (
                <EmptyRow colSpan={4}>هنوز برندی ثبت نشده. از فرم بالا اولین برند را بسازید.</EmptyRow>
              )}
            </tbody>
          </table>
        </div>
        <ListFooter list={list} />
      </Card>
    </div>
  );
}
