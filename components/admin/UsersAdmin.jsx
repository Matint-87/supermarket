"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { FaBan, FaCheckCircle, FaEdit, FaPlus, FaTrash } from "react-icons/fa";
import AdminFilters from "@/components/admin/AdminFilters";
import ListFooter from "@/components/admin/ListFooter";
import UserForm from "@/components/admin/UserForm";
import { useInfiniteList } from "@/components/admin/useInfiniteList";
import {
  ActiveBadge,
  Card,
  EmptyRow,
  PageHeader,
  RoleBadge,
  UserAvatar,
  theadRowCls,
  trCls,
} from "@/components/admin/ui";
import { btnPrimary } from "@/components/ui/form";
import { ROLE_OPTIONS } from "@/lib/admin-constants";
import { api } from "@/lib/api-client";
import { formatNumber } from "@/lib/format";
import { formatJalaliDate } from "@/lib/jalali";
import { notify, useToastOnChange } from "@/lib/toast";
import { useConfirm } from "@/components/providers/ConfirmProvider";

export default function UsersAdmin({ filters, initial, currentAdminId }) {
  const confirm = useConfirm();
  const list = useInfiniteList({ endpoint: "/api/admin/users", itemsKey: "users", filters, initial });
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState("");
  useToastOnChange(error); // پیام خطا به‌صورت toast نشون داده می‌شه

  async function toggleActive(u) {
    const verb = u.isActive ? "مسدود" : "فعال";
    if (!(await confirm({ title: `${verb} کردن حساب`, description: `حساب این کاربر ${verb} شود؟`, confirmText: "تأیید", destructive: u.isActive }))) return;
    setError("");
    try {
      const data = await api("PATCH", `/api/admin/users/${u.id}`, { isActive: !u.isActive });
      notify.success("وضعیت حساب کاربر تغییر کرد.");
      list.patchItem(u.id, data.user);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(u) {
    if (!(await confirm({ title: "حذف کاربر", description: `کاربر ${u.phone} برای همیشه حذف شود؟ این کار قابل بازگشت نیست.`, confirmText: "حذف" }))) return;
    setError("");
    try {
      await api("DELETE", `/api/admin/users/${u.id}`);
      notify.success("کاربر حذف شد.");
      list.removeItem(u.id);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <PageHeader
        title="کاربران"
        description={`مدیریت حساب‌ها، نقش‌ها و مسدودسازی — ${formatNumber(list.total)} کاربر`}
      >
        {!showCreate && (
          <button type="button" onClick={() => setShowCreate(true)} className={cn(btnPrimary, "h-10 w-auto px-4")}>
            <FaPlus size={14} />
            کاربر جدید
          </button>
        )}
      </PageHeader>

      {showCreate && (
        <Card title="کاربر جدید" className="mb-4">
          <UserForm
            onDone={() => {
              setShowCreate(false);
              list.reload(); // کاربر جدید بالای لیست (جدیدترین اول) قرار می‌گیره
            }}
            onCancel={() => setShowCreate(false)}
          />
        </Card>
      )}

      <AdminFilters
        placeholder="نام، موبایل یا ایمیل…"
        selects={[
          { name: "role", label: "نقش", options: ROLE_OPTIONS },
          {
            name: "status",
            label: "وضعیت",
            options: [
              { value: "active", label: "فعال" },
              { value: "banned", label: "مسدود" },
            ],
          },
        ]}
      />


      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-start text-xs">
            <thead>
              <tr className={theadRowCls}>
                <th className="py-2.5 ps-3 pe-3 font-medium">کاربر</th>
                <th className="py-2.5 pe-3 font-medium">موبایل</th>
                <th className="py-2.5 pe-3 font-medium">نقش</th>
                <th className="py-2.5 pe-3 font-medium">وضعیت</th>
                <th className="py-2.5 pe-3 font-medium">سفارش‌ها</th>
                <th className="py-2.5 pe-3 font-medium">عضویت</th>
                <th className="py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {list.items.map((u) => {
                const isSelf = u.id === currentAdminId;
                const name = [u.firstName, u.lastName].filter(Boolean).join(" ");
                return (
                  <tr key={u.id} className={trCls}>
                    <td className="py-2.5 ps-3 pe-3">
                      <div className="flex items-center gap-2">
                        <UserAvatar user={u} />
                        <div className="min-w-0">
                          <Link href={`/admin/users/${u.id}`} className="font-medium text-slate-800 hover:text-green-700">
                            {name || "بدون نام"}
                          </Link>
                          {isSelf && <span className="ms-1 text-xs text-slate-400">(شما)</span>}
                          {u.email && (
                            <p className="truncate text-slate-400">
                              <bdi dir="ltr">{u.email}</bdi>
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 pe-3 text-slate-600">
                      {/* dir=ltr فقط روی خودِ عدد؛ اگه روی td بیاد ستون چپ‌چین می‌شه و زیر «موبایل» نمی‌افته */}
                      <span dir="ltr" className="inline-block">
                        {u.phone}
                      </span>
                    </td>
                    <td className="py-2.5 pe-3">
                      <RoleBadge role={u.role} />
                    </td>
                    <td className="py-2.5 pe-3">
                      <ActiveBadge active={u.isActive} on="فعال" off="مسدود" />
                    </td>
                    <td className="py-2.5 pe-3 text-slate-600">{formatNumber(u.orderCount)}</td>
                    <td className="py-2.5 pe-3 text-slate-600">{formatJalaliDate(u.createdAt)}</td>
                    <td className="py-2.5 pe-3">
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/admin/users/${u.id}`}
                          aria-label="مشاهده و ویرایش"
                          className="text-slate-500 hover:text-green-700"
                        >
                          <FaEdit size={14} />
                        </Link>
                        {!isSelf && (
                          <>
                            <button
                              type="button"
                              onClick={() => toggleActive(u)}
                              aria-label={u.isActive ? "مسدود کردن" : "فعال کردن"}
                              title={u.isActive ? "مسدود کردن" : "فعال کردن"}
                              className={u.isActive ? "text-slate-500 hover:text-amber-600" : "text-slate-500 hover:text-green-700"}
                            >
                              {u.isActive ? <FaBan size={14} /> : <FaCheckCircle size={14} />}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(u)}
                              aria-label="حذف"
                              className="text-slate-500 hover:text-red-600"
                            >
                              <FaTrash size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {list.items.length === 0 && !list.loading && <EmptyRow colSpan={7}>کاربری پیدا نشد.</EmptyRow>}
            </tbody>
          </table>
        </div>
        <ListFooter list={list} />
      </Card>
    </div>
  );
}
