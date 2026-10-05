"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Select } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, Spinner, btnSecondary, inputCls } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { OTHER_REASON, buildCancelReason } from "@/lib/order-constants";

/**
 * دیالوگ لغو سفارش با «دلیل» اجباری (انتخاب از لیست + توضیح؛ با «سایر» توضیح اجباریه).
 * onSubmit(reasonText) باید Promise برگردونه؛ اگه خطا پرتاب کنه دیالوگ باز می‌مونه و کار تکرار می‌شه.
 */
export default function CancelOrderDialog({ open, onOpenChange, reasons, title, description, submitLabel = "لغو سفارش", onSubmit }) {
  const [selected, setSelected] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function handleOpenChange(next) {
    if (busy) return;
    if (!next) {
      setSelected("");
      setNote("");
      setError("");
    }
    onOpenChange(next);
  }

  async function submit(e) {
    e.preventDefault();
    if (!selected) return setError("دلیل لغو را انتخاب کنید");
    if (selected === OTHER_REASON && note.trim().length < 3) return setError("لطفاً دلیل لغو را بنویسید");
    setBusy(true);
    setError("");
    try {
      await onSubmit(buildCancelReason(selected, note));
      handleOpenChange(false);
    } catch {
      // پیام خطا توسط فراخواننده toast می‌شه
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form onSubmit={submit} noValidate className="space-y-4">
          <Field label="دلیل لغو" htmlFor="cancelReason" required error={error}>
            <Select
              id="cancelReason"
              value={selected}
              onChange={(e) => {
                setSelected(e.target.value);
                setError("");
              }}
              className={inputCls(Boolean(error))}
            >
              <option value="">انتخاب کنید…</option>
              {reasons.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={selected === OTHER_REASON ? "توضیح (الزامی)" : "توضیحات (اختیاری)"} htmlFor="cancelNote">
            <textarea
              id="cancelNote"
              rows={3}
              maxLength={200}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className={`${inputCls(false)} h-auto resize-none py-3`}
            />
          </Field>
          <DialogFooter>
            <Button type="submit" variant="destructive" size="lg" disabled={busy}>
              {busy && <Spinner />}
              {submitLabel}
            </Button>
            <button type="button" onClick={() => handleOpenChange(false)} disabled={busy} className={cn(btnSecondary, "px-6")}>
              انصراف
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
