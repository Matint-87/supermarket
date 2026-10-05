"use client";

import { useEffect, useState } from "react";
import { FaArrowDown, FaArrowUp, FaWallet } from "react-icons/fa";
import { api } from "@/lib/api-client";
import { formatToman } from "@/lib/format";
import { formatJalaliDateTime } from "@/lib/jalali";
import { toFaDigits } from "@/lib/phone";
import { WALLET_REASON_LABELS } from "@/lib/order-constants";
import { useToastOnChange } from "@/lib/toast";

/** کیف پول کاربر: موجودی + تاریخچه (برگشت وجه سفارش‌های لغوشده، پرداخت از اعتبار، اصلاح توسط مدیر) */
export default function WalletPanel() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useToastOnChange(error);

  useEffect(() => {
    let alive = true;
    api("GET", "/api/wallet")
      .then((d) => alive && setData(d))
      .catch((err) => {
        if (!alive) return;
        setError(err.message);
        setData({ balance: 0, transactions: [] });
      });
    return () => {
      alive = false;
    };
  }, []);

  if (!data) return <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />;

  return (
    <div>
      <div className="mb-5 flex items-center gap-4 rounded-2xl bg-linear-to-l from-green-700 to-green-500 p-5 text-white shadow-brand">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
          <FaWallet size={22} />
        </span>
        <div>
          <p className="text-xs text-green-50/90">موجودی کیف پول</p>
          <p className="text-2xl font-extrabold">{formatToman(data.balance)}</p>
        </div>
      </div>
      <p className="mb-5 text-xs leading-6 text-slate-500">
        اگر سفارشی را لغو کنید، مبلغ پرداخت‌شده‌ی آن به‌صورت خودکار به کیف پول شما برمی‌گردد و می‌توانید در سفارش‌های بعدی از آن استفاده کنید.
      </p>

      <h3 className="mb-3 text-sm font-bold text-slate-800">تاریخچه‌ی تراکنش‌ها</h3>
      {data.transactions.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 py-10 text-center text-xs text-slate-400">هنوز تراکنشی ثبت نشده است</p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200/80">
          {data.transactions.map((t) => {
            const credit = t.type === "CREDIT";
            return (
              <li key={t.id} className="flex items-center gap-3 p-3 text-xs">
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    credit ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                  }`}
                >
                  {credit ? <FaArrowDown size={12} /> : <FaArrowUp size={12} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-800">
                    {WALLET_REASON_LABELS[t.reason] ?? t.reason}
                    {t.orderCode && <span className="ms-1 font-normal text-slate-500">— سفارش {toFaDigits(t.orderCode)}</span>}
                  </p>
                  {t.note && <p className="truncate text-slate-500">{t.note}</p>}
                  <p className="text-xs text-slate-400">{formatJalaliDateTime(t.createdAt)}</p>
                </div>
                <div className="shrink-0 text-end">
                  <p className={`font-extrabold ${credit ? "text-emerald-600" : "text-rose-600"}`}>
                    {credit ? "+" : "−"}
                    {formatToman(t.amount)}
                  </p>
                  <p className="text-xs text-slate-400">مانده: {formatToman(t.balanceAfter)}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
