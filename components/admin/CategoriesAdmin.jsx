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

const EMPTY = { name: "", sortOrder: "0", isActive: true };

export default function CategoriesAdmin({ initial }) {
  const confirm = useConfirm();
  // لیست دسته‌ها: ۱۰ تای اول از سرور، بقیه ۱۰تا۱۰تا با اسکرول
  const list = useInfiniteList({ endpoint: "/api/admin/categories", itemsKey: "categories", initial });
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
      await api("POST", "/api/categories", {
        name: createForm.name,
        sortOrder: createForm.sortOrder === "" ? 0 : createForm.sortOrder,
        isActive: createForm.isActive,
      });
      notify.success("دسته‌ی جدید اضافه شد.");
      setCreateForm({ ...EMPTY, sortOrder: String(list.total + 1) });
      list.reload(); // ترتیب نمایش ممکنه عوض شده باشه، پس لیست از اول گرفته می‌شه
    } catch (err) {
      if (err.fields && Object.keys(err.fields).length) setCreateErrors(err.fields);
      else setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  function startEdit(c) {
    setEditId(c.id);
    setEditForm({ name: c.name, sortOrder: String(c.sortOrder), isActive: c.isActive });
    setEditErrors({});
    setError("");
  }

  async function handleSave(id) {
    setSaving(true);
    setEditErrors({});
    setError("");
    try {
      await api("PATCH", `/api/categories/${id}`, {
        name: editForm.name,
        sortOrder: editForm.sortOrder === "" ? 0 : editForm.sortOrder,
        isActive: editForm.isActive,
      });
      notify.success("تغییرات دسته ذخیره شد.");
      setEditId(null);
      list.reload(); // با تغییر «ترتیب نمایش» جای ردیف‌ها عوض می‌شه، پس لیست دوباره مرتب گرفته می‌شه
    } catch (err) {
      if (err.fields && Object.keys(err.fields).length) setEditErrors(err.fields);
      else setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(c) {
    if (!(await confirm({ title: "حذف دسته", description: `دسته‌ی «${c.name}» حذف شود؟`, confirmText: "حذف" }))) return;
    setError("");
    try {
      await api("DELETE", `/api/categories/${c.id}`);
      notify.success("دسته حذف شد.");
      list.removeItem(c.id);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <PageHeader
        title="دسته‌بندی‌ها"
        description={`ترتیب نمایش عدد کوچک‌تر یعنی بالاتر در سایت — ${formatNumber(list.total)} دسته`}
      />


      <Card title="دسته‌ی جدید" className="mb-4">
        <form onSubmit={handleCreate} noValidate className="flex flex-wrap items-start gap-3">
          <Field label="نام دسته" htmlFor="newName" error={createErrors.name} className="min-w-[200px] flex-1">
            <input
              id="newName"
              value={createForm.name}
              onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="مثلاً تنقلات"
              className={inputCls(Boolean(createErrors.name))}
            />
          </Field>
          <Field label="ترتیب نمایش" htmlFor="newSort" error={createErrors.sortOrder} className="w-32">
            <input
              id="newSort"
              type="number"
              value={createForm.sortOrder}
              onChange={(e) => setCreateForm((f) => ({ ...f, sortOrder: e.target.value }))}
              className={inputCls(Boolean(createErrors.sortOrder))}
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
          <table className="w-full min-w-[560px] text-start text-xs">
            <thead>
              <tr className={theadRowCls}>
                <th className="py-2.5 ps-3 pe-3 font-medium">نام</th>
                <th className="py-2.5 pe-3 font-medium">ترتیب</th>
                <th className="py-2.5 pe-3 font-medium">محصولات</th>
                <th className="py-2.5 pe-3 font-medium">وضعیت</th>
                <th className="py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {list.items.map((c) =>
                editId === c.id ? (
                  <tr key={c.id} className="border-b border-slate-100 bg-green-50/40 align-top">
                    <td className="py-2 ps-3 pe-3">
                      <input
                        value={editForm.name}
                        onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                        aria-label="نام دسته"
                        className={inputCls(Boolean(editErrors.name))}
                      />
                      {editErrors.name && <p className="mt-1 text-xs text-red-600">{editErrors.name}</p>}
                    </td>
                    <td className="py-2 pe-3">
                      <input
                        type="number"
                        value={editForm.sortOrder}
                        onChange={(e) => setEditForm((f) => ({ ...f, sortOrder: e.target.value }))}
                        aria-label="ترتیب نمایش"
                        className={`${inputCls(Boolean(editErrors.sortOrder))} w-24`}
                      />
                    </td>
                    <td className="py-4 pe-3 text-slate-500">{formatNumber(c.productCount)}</td>
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
                          onClick={() => handleSave(c.id)}
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
                  <tr key={c.id} className={trCls}>
                    <td className="py-2.5 ps-3 pe-3 font-medium text-slate-800">{c.name}</td>
                    <td className="py-2.5 pe-3 text-slate-600">{formatNumber(c.sortOrder)}</td>
                    <td className="py-2.5 pe-3 text-slate-600">{formatNumber(c.productCount)}</td>
                    <td className="py-2.5 pe-3">
                      <ActiveBadge active={c.isActive} />
                    </td>
                    <td className="py-2.5">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => startEdit(c)}
                          aria-label={`ویرایش ${c.name}`}
                          className="text-slate-500 hover:text-green-700"
                        >
                          <FaEdit size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(c)}
                          aria-label={`حذف ${c.name}`}
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
                <EmptyRow colSpan={5}>هنوز دسته‌ای ثبت نشده. از فرم بالا اولین دسته را بسازید.</EmptyRow>
              )}
            </tbody>
          </table>
        </div>
        <ListFooter list={list} />
      </Card>
    </div>
  );
}
