"use client";

import { useState } from "react";
import { FaCreditCard, FaWallet } from "react-icons/fa";
import { Spinner } from "@/components/ui/form";
import { api } from "@/lib/api-client";
import { formatToman } from "@/lib/format";
import { notify } from "@/lib/toast";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * پرداخت یک سفارش: «کیف پول» و/یا «درگاه».
 *  • تیکِ کیف پول: تا سقف موجودی از اعتبار کم می‌شه و «بقیه» (اگه موجودی کم باشه) از درگاه پرداخت می‌شه.
 *  • بدون تیک: کل مبلغ مانده از درگاه.
 * props: order {code, payment:{remaining}}, walletBalance, onPaid(), compact
 */
export default function PayPanel({ order, walletBalance = 0, onPaid, compact = false }) {
  const remaining = order.payment?.remaining ?? order.payable;
  const [useWallet, setUseWallet] = useState(walletBalance > 0);
  const [busy, setBusy] = useState(false);

  const walletPart = useWallet ? Math.min(walletBalance, remaining) : 0;
  const gatewayPart = remaining - walletPart;

  async function pay() {
    setBusy(true);
    try {
      const data = await api("POST", `/api/orders/${order.code}/pay`, { useWallet });
      if (data.redirectUrl) {
        // بخشی از مبلغ (اگه کیف پول انتخاب شده) همین حالا کم شده؛ بقیه رو توی درگاه می‌پردازه
        window.location.assign(data.redirectUrl);
        return; // تا رفتن به درگاه دکمه غیرفعال می‌مونه
      }
      notify.success("پرداخت با موفقیت انجام شد.");
      onPaid?.(data);
    } catch (err) {
      notify.error(err.message);
    }
    setBusy(false);
  }

  const label =
    gatewayPart === 0
      ? `پرداخت ${formatToman(walletPart)} از کیف پول`
      : walletPart > 0
        ? `پرداخت ${formatToman(walletPart)} از کیف پول و ${formatToman(gatewayPart)} از درگاه`
        : `پرداخت ${formatToman(gatewayPart)} از درگاه`;

  return (
    <div className={`rounded-2xl border border-green-200 bg-green-50/40 text-start ${compact ? "p-3" : "p-4"}`}>
      <p className="mb-2 text-xs font-bold text-slate-800">پرداخت سفارش — مانده: {formatToman(remaining)}</p>

      <label
        className={`flex items-start gap-3 rounded-xl border bg-white p-3 text-xs transition ${
          walletBalance > 0 ? "cursor-pointer border-slate-200 hover:border-green-300" : "cursor-not-allowed border-slate-100 opacity-60"
        }`}
      >
        <input
          type="checkbox"
          checked={useWallet}
          disabled={walletBalance <= 0 || busy}
          onChange={(e) => setUseWallet(e.target.checked)}
          className="mt-1 accent-green-700"
        />
        <FaWallet className="mt-0.5 shrink-0 text-green-700" size={14} />
        <span className="min-w-0 flex-1 leading-6">
          <span className="block font-bold text-slate-800">پرداخت از اعتبار کیف پول</span>
          <span className="block text-slate-500">
            موجودی: {formatToman(walletBalance)}
            {useWallet && walletPart > 0 && gatewayPart > 0 && " — باقی‌مانده از درگاه پرداخت می‌شود"}
          </span>
        </span>
      </label>

      {gatewayPart > 0 && (
        <p className="mt-2 flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 text-xs text-slate-600">
          <FaCreditCard className="shrink-0 text-green-700" size={14} />
          پرداخت اینترنتی از درگاه بانکی: <span className="font-bold text-slate-800">{formatToman(gatewayPart)}</span>
        </p>
      )}

      <button
        type="button"
        onClick={pay}
        disabled={busy}
        className={cn(buttonVariants({ size: "default" }), "mt-3 flex w-full")}
      >
        {busy && <Spinner />}
        {label}
      </button>
    </div>
  );
}
