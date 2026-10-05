"use client";

import { useState } from "react";
import { FaDoorClosed, FaDoorOpen } from "react-icons/fa";
import { Card, PageHeader } from "@/components/admin/ui";
import { Field, Spinner, btnPrimary, inputCls } from "@/components/ui/form";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { api } from "@/lib/api-client";
import { STORE_CLOSED_DEFAULT_MESSAGE } from "@/lib/admin-constants";
import { notify } from "@/lib/toast";
import { cn } from "@/lib/utils";

/** صفحه‌ی «وضعیت فروشگاه»: دکمه‌ی باز/بستن فروشگاه + متن پیام تعطیلی */
export default function StoreStatusAdmin({ initial }) {
  const confirm = useConfirm();
  const [open, setOpen] = useState(initial.open);
  const [message, setMessage] = useState(initial.closedMessage);
  const [busy, setBusy] = useState(false);
  const [savingMsg, setSavingMsg] = useState(false);

  async function save(next, text) {
    const data = await api("PUT", "/api/admin/store-status", { open: next, closedMessage: text });
    setOpen(data.status.open);
    setMessage(data.status.closedMessage);
    return data.status;
  }

  // دکمه‌ی اصلی: باز ⇄ بسته
  async function toggle() {
    const next = !open;
    if (!next) {
      // بستن فروشگاه روی همه‌ی مشتری‌ها اثر می‌ذاره؛ قبلش تأیید می‌گیریم
      const okToClose = await confirm({
        title: "بستن فروشگاه",
        description: "با بستن فروشگاه، مشتری‌ها نمی‌تونن کالایی به سبد اضافه کنن یا سفارش ثبت کنن. مطمئنی؟",
        confirmText: "بستن فروشگاه",
      });
      if (!okToClose) return;
    }
    setBusy(true);
    try {
      await save(next, message);
      notify.success(next ? "فروشگاه باز شد؛ مشتری‌ها می‌تونن سفارش ثبت کنن." : "فروشگاه بسته شد.");
    } catch (err) {
      notify.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  // ذخیره‌ی فقط متن پیام (وضعیت باز/بسته همون می‌مونه)
  async function saveMessage(e) {
    e.preventDefault();
    setSavingMsg(true);
    try {
      await save(open, message);
      notify.success("پیام تعطیلی ذخیره شد.");
    } catch (err) {
      notify.error(err.message);
    } finally {
      setSavingMsg(false);
    }
  }

  return (
    <div>
      <PageHeader title="وضعیت فروشگاه" description="باز یا بسته‌کردن فروشگاه برای ثبت سفارش" />

      <div className="space-y-4">
        <Card title="باز / بسته">
          <div
            className={cn(
              "flex flex-col gap-4 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between",
              open ? "border-green-200 bg-green-50/60" : "border-slate-200 bg-slate-100/70",
            )}
          >
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white",
                  open ? "bg-green-600" : "bg-slate-500",
                )}
              >
                {open ? <FaDoorOpen size={22} /> : <FaDoorClosed size={22} />}
              </span>
              <div>
                <p className="text-sm font-extrabold text-slate-800">{open ? "فروشگاه باز است" : "فروشگاه بسته است"}</p>
                <p className="mt-0.5 text-xs leading-6 text-slate-500">
                  {open
                    ? "مشتری‌ها می‌تونن کالا به سبد اضافه کنن و سفارش ثبت کنن."
                    : "مشتری‌ها با زدن «افزودن به سبد» پیام تعطیلی رو می‌بینن و سفارشی ثبت نمی‌شه."}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={toggle}
              disabled={busy}
              className={cn(btnPrimary, "w-full shrink-0 sm:w-auto")}
            >
              {busy && <Spinner />}
              {open ? "بستن فروشگاه" : "باز کردن فروشگاه"}
            </button>
          </div>
        </Card>

        <Card title="پیام تعطیلی">
          <form onSubmit={saveMessage} noValidate className="space-y-3">
            <Field
              label="متنی که توی مودال به مشتری نشون داده می‌شه"
              htmlFor="closedMessage"
              hint="مثلاً ساعت بازشدن فروشگاه رو اینجا بنویس. خالی بذاری متن پیش‌فرض استفاده می‌شه."
            >
              <textarea
                id="closedMessage"
                rows={3}
                maxLength={200}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={STORE_CLOSED_DEFAULT_MESSAGE}
                className={`${inputCls(false)} h-auto py-3`}
              />
            </Field>
            <button type="submit" disabled={savingMsg} className={cn(btnPrimary, "w-auto px-8")}>
              {savingMsg && <Spinner />}
              ذخیره‌ی پیام
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}
