"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { FaMapMarkerAlt, FaPen, FaPlus, FaStar, FaTrash } from "react-icons/fa";
import { api } from "@/lib/api-client";
import { toFaDigits } from "@/lib/phone";
import { Spinner, btnSecondary } from "@/components/ui/form";
import AddressForm from "@/components/address/AddressForm";
import { notify, useToastOnChange } from "@/lib/toast";
import { useConfirm } from "@/components/providers/ConfirmProvider";

function AddressCard({ address, onEdit, onDelete, busy }) {
  const line = [address.province, address.city, address.neighborhood, address.addressLine]
    .filter(Boolean)
    .join("، ");
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 transition hover:border-green-200 hover:shadow-soft">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50 text-green-700">
            <FaMapMarkerAlt size={14} />
          </span>
          <div>
            <p className="text-sm font-bold text-slate-800">{address.label || "آدرس"}</p>
            {address.isDefault && (
              <span className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-amber-600">
                <FaStar size={10} /> پیش‌فرض
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onEdit(address)}
            aria-label="ویرایش"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-50 hover:text-green-700"
          >
            <FaPen size={13} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(address)}
            disabled={busy}
            aria-label="حذف"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
          >
            <FaTrash size={13} />
          </button>
        </div>
      </div>
      <p className="text-xs leading-6 text-slate-600">{line}</p>
      <p className="mt-1 text-xs text-slate-500">
        {address.recipientName} — <span dir="ltr">{toFaDigits(address.recipientPhone)}</span> — کد پستی{" "}
        <span dir="ltr">{toFaDigits(address.postalCode)}</span>
      </p>
    </div>
  );
}

export default function AddressList() {
  const confirm = useConfirm();
  const [addresses, setAddresses] = useState(null); // null = در حال بارگذاری
  const [error, setError] = useState("");
  useToastOnChange(error); // پیام خطا به‌صورت toast نشون داده می‌شه
  const [editing, setEditing] = useState(null); // null | "new" | address
  const [busyId, setBusyId] = useState(null);

  function load() {
    setError("");
    api("GET", "/api/addresses")
      .then((data) => setAddresses(data.addresses))
      .catch((err) => setError(err.message));
  }

  useEffect(load, []);

  async function handleDelete(address) {
    if (!(await confirm({ title: "حذف آدرس", description: `آدرس «${address.label || "این آدرس"}» حذف شود؟`, confirmText: "حذف" }))) return;
    setBusyId(address.id);
    try {
      await api("DELETE", `/api/addresses/${address.id}`);
      notify.success("آدرس حذف شد.");
      setAddresses((list) => list.filter((a) => a.id !== address.id));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  function handleSaved(address) {
    setAddresses((list) => {
      const list2 = list.filter((a) => a.id !== address.id);
      const next = address.isDefault ? list2.map((a) => ({ ...a, isDefault: false })) : list2;
      return [...next, address].sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0));
    });
    setEditing(null);
  }

  if (editing) {
    return (
      <div>
        <h3 className="mb-4 text-sm font-bold text-slate-800">
          {editing === "new" ? "آدرس جدید" : "ویرایش آدرس"}
        </h3>
        <AddressForm
          initialAddress={editing === "new" ? null : editing}
          onSaved={handleSaved}
          onCancel={() => setEditing(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {addresses === null ? (
        <div className="flex justify-center py-8">
          <Spinner className="text-green-700" />
        </div>
      ) : addresses.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-xs text-slate-400">
          هنوز آدرسی ثبت نکرده‌اید
        </p>
      ) : (
        <div className="space-y-3">
          {addresses.map((a) => (
            <AddressCard key={a.id} address={a} onEdit={setEditing} onDelete={handleDelete} busy={busyId === a.id} />
          ))}
        </div>
      )}
      {addresses !== null && addresses.length < 10 && (
        <button
          type="button"
          onClick={() => setEditing("new")}
          className={cn(btnSecondary, "w-full border-dashed")}
        >
          <FaPlus size={12} />
          افزودن آدرس جدید
        </button>
      )}
    </div>
  );
}
