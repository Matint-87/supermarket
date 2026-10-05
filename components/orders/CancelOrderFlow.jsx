"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FaWallet } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { btnSecondary } from "@/components/ui/form";
import CancelOrderDialog from "@/components/orders/CancelOrderDialog";
import { formatToman } from "@/lib/format";
import { toFaDigits } from "@/lib/phone";
import { USER_CANCEL_REASONS } from "@/lib/order-constants";
import { cn } from "@/lib/utils";

/**
 * لغو سفارش در دو مرحله:
 *  ۱) مودال توضیح: چی می‌شه (مبلغ به کیف پول برمی‌گرده و در خرید بعدی قابل استفاده‌ست) + تیک «قوانین لغو را خوانده‌ام».
 *     دکمه‌ی «ادامه» تا وقتی تیک نخورده غیرفعاله؛ «انصراف» همه‌چیز رو می‌بنده.
 *  ۲) دیالوگ انتخاب دلیل لغو (CancelOrderDialog) که سفارش رو واقعاً لغو می‌کنه.
 * props: open, onOpenChange, order, onSubmit(reason) → Promise
 */
export default function CancelOrderFlow({ open, onOpenChange, order, onSubmit }) {
  const [step, setStep] = useState("info"); // "info" | "reason"
  const [agreed, setAgreed] = useState(false);
  const paid = order.payment?.paid ?? 0;

  // هر بار که فلو باز می‌شه از اول شروع کن
  useEffect(() => {
    if (open) {
      setStep("info");
      setAgreed(false);
    }
  }, [open]);

  return (
    <>
      <Dialog open={open && step === "info"} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>لغو سفارش {toFaDigits(order.code)}</DialogTitle>
            <DialogDescription>قبل از ادامه، این موارد را بخوانید:</DialogDescription>
          </DialogHeader>

          {paid > 0 ? (
            <div className="flex gap-3 rounded-xl bg-green-50 p-3.5 text-xs leading-6 text-green-900">
              <FaWallet size={16} className="mt-1 shrink-0 text-green-700" />
              <p>
                با لغو سفارش، مبلغ پرداخت‌شده‌ی شما (<span className="font-bold">{formatToman(paid)}</span>) به{" "}
                <span className="font-bold">کیف پول شما</span> اضافه می‌شود و می‌توانید در خرید‌های بعدی از آن استفاده کنید.
              </p>
            </div>
          ) : (
            <p className="rounded-xl bg-slate-50 p-3.5 text-xs leading-6 text-slate-600">
              برای این سفارش مبلغی پرداخت نکرده‌اید، پس چیزی به کیف پول شما اضافه نمی‌شود.
            </p>
          )}

          <ul className="list-disc space-y-1.5 ps-5 text-xs leading-6 text-slate-600">
            <li>سفارش لغوشده قابل بازگشت نیست؛ برای خرید دوباره باید سفارش جدید ثبت کنید.</li>
            <li>کالاها به انبار برمی‌گردند.</li>
            <li>لغو فقط تا قبل از شروع آماده‌سازی سفارش ممکن است.</li>
          </ul>

          <label htmlFor="cancelRules" className="flex cursor-pointer items-center gap-2.5 text-xs text-slate-700">
            <Checkbox id="cancelRules" checked={agreed} onCheckedChange={(v) => setAgreed(v === true)} />
            <span>
              <Link href="/returns" target="_blank" className="font-bold text-green-700 underline underline-offset-4">
                قوانین لغو سفارش
              </Link>{" "}
              را خوانده‌ام.
            </span>
          </label>

          <DialogFooter>
            <Button type="button" variant="destructive" size="lg" disabled={!agreed} onClick={() => setStep("reason")}>
              ادامه
            </Button>
            <button type="button" onClick={() => onOpenChange(false)} className={cn(btnSecondary, "px-6")}>
              انصراف
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CancelOrderDialog
        open={open && step === "reason"}
        onOpenChange={onOpenChange}
        reasons={USER_CANCEL_REASONS}
        title={`دلیل لغو سفارش ${toFaDigits(order.code)}`}
        description="لطفاً دلیل لغو را مشخص کنید."
        onSubmit={onSubmit}
      />
    </>
  );
}
