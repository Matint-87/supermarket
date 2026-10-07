import { notFound } from "next/navigation";
import { sandboxEnabled } from "@/lib/gateway";
import { prisma } from "@/lib/db";
import { formatToman } from "@/lib/format";
import { toFaDigits } from "@/lib/phone";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata = { title: "درگاه آزمایشی پرداخت", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * درگاه آزمایشی (فقط وقتی ZARINPAL_MERCHANT_ID تنظیم نشده و محیط توسعه است یا PAYMENT_SANDBOX=1).
 * جای صفحه‌ی بانک: دو دکمه برای شبیه‌سازی «پرداخت موفق» و «انصراف».
 */
export default async function SandboxGatewayPage({ searchParams }) {
  if (!sandboxEnabled()) notFound();
  const { authority } = await searchParams;
  if (typeof authority !== "string" || !authority.startsWith("SBX")) notFound();

  const tx = await prisma.transaction.findUnique({ where: { authority }, include: { order: true } });
  if (!tx) notFound();
  const q = encodeURIComponent(authority);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-100 px-4 font-[Number]">
      <div className="w-full max-w-sm rounded-3xl border border-amber-200 bg-white p-6 text-center shadow-sm">
        <p className="mb-3 inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
          درگاه آزمایشی — پولی کسر نمی‌شود
        </p>
        <h1 className="text-lg font-extrabold text-slate-800">پرداخت سفارش {toFaDigits(tx.order.code)}</h1>
        <p className="mt-2 text-2xl font-extrabold text-green-700">{formatToman(tx.amount)}</p>
        <div className="mt-6 flex flex-col gap-2">
          <a
            href={`/api/payments/callback?Authority=${q}&Status=OK`}
            className={cn(buttonVariants({ size: "lg" }), "flex")}
          >
            پرداخت موفق
          </a>
          <a
            href={`/api/payments/callback?Authority=${q}&Status=NOK`}
            className={cn(buttonVariants({ variant: "outline", size: "lg" }), "flex")}
          >
            انصراف از پرداخت
          </a>
        </div>
      </div>
    </div>
  );
}
