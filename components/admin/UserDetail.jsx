"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import UserForm from "@/components/admin/UserForm";
import WalletCard from "@/components/admin/WalletCard";
import UserOrdersCard from "@/components/admin/UserOrdersCard";
import { ActiveBadge, Card, PageHeader, RoleBadge, UserAvatar } from "@/components/admin/ui";
import { formatNumber } from "@/lib/format";
import { formatJalaliDate } from "@/lib/jalali";
import { toFaDigits } from "@/lib/phone";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function UserDetail({ user, addresses, initialOrders, isSelf, wallet }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ");

  return (
    <div>
      <PageHeader title={name || "بدون نام"} description={`عضویت از ${formatJalaliDate(user.createdAt)}`}>
        <RoleBadge role={user.role} />
        <ActiveBadge active={user.isActive} on="فعال" off="مسدود" />
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-1">
          <Card title="اطلاعات حساب">
            {editing ? (
              <UserForm
                user={user}
                isSelf={isSelf}
                onDone={() => {
                  setEditing(false);
                  router.refresh();
                }}
                onCancel={() => setEditing(false)}
              />
            ) : (
              <div className="space-y-3 text-xs">
                <div className="flex items-center gap-3">
                  <UserAvatar user={user} size={48} />
                  <div>
                    <p className="font-bold text-slate-800">{name || "بدون نام"}</p>
                    <p className="text-slate-500">
                      <span dir="ltr" className="inline-block">
                        {user.phone}
                      </span>
                    </p>
                  </div>
                </div>
                <dl className="space-y-1.5 border-t border-slate-100 pt-3">
                  <div className="flex justify-between">
                    <dt className="text-slate-500">ایمیل</dt>
                    <dd className="text-slate-700" dir="ltr">
                      {user.email || "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">کد ملی</dt>
                    <dd className="text-slate-700" dir="ltr">
                      {user.nationalCode ? toFaDigits(user.nationalCode) : "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">تعداد سفارش‌ها</dt>
                    <dd className="text-slate-700">{formatNumber(user.orderCount)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">آخرین ورود</dt>
                    <dd className="text-slate-700">{user.lastLoginAt ? formatJalaliDate(user.lastLoginAt) : "—"}</dd>
                  </div>
                </dl>
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-2 flex w-full")}
                >
                  ویرایش اطلاعات
                </button>
              </div>
            )}
          </Card>

          <WalletCard userId={user.id} wallet={wallet} />

          <Card title={`آدرس‌ها (${formatNumber(addresses.length)})`}>
            {addresses.length === 0 ? (
              <p className="py-2 text-center text-xs text-slate-400">آدرسی ثبت نشده.</p>
            ) : (
              <ul className="space-y-3 text-xs">
                {addresses.map((a) => (
                  <li key={a.id} className="rounded-xl border border-slate-100 p-3">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="font-medium text-slate-700">{a.label || "بدون عنوان"}</span>
                      {a.isDefault && <span className="text-xs text-green-700">پیش‌فرض</span>}
                    </div>
                    <p className="text-slate-500">
                      {a.province}، {a.city}، {a.neighborhood}، {a.addressLine}، پلاک {toFaDigits(a.plaque)}
                      {a.unit ? `، واحد ${toFaDigits(a.unit)}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="min-w-0 lg:col-span-2">
          <UserOrdersCard userId={user.id} initial={initialOrders} />
        </div>
      </div>
    </div>
  );
}
