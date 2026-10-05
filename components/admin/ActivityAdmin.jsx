"use client";

import AdminFilters from "@/components/admin/AdminFilters";
import ListFooter from "@/components/admin/ListFooter";
import { useInfiniteList } from "@/components/admin/useInfiniteList";
import { Card, EmptyRow, PageHeader, theadRowCls, trCls } from "@/components/admin/ui";
import {
  ACTIVITY_ACTION_META,
  ACTIVITY_ACTION_OPTIONS,
  ACTIVITY_ENTITY_LABELS,
  ACTIVITY_ENTITY_OPTIONS,
} from "@/lib/admin-constants";
import { formatNumber } from "@/lib/format";
import { formatJalaliDateTime } from "@/lib/jalali";
import { toFaDigits } from "@/lib/phone";

export default function ActivityAdmin({ filters, initial }) {
  const list = useInfiniteList({ endpoint: "/api/admin/activity", itemsKey: "logs", filters, initial });

  return (
    <div>
      <PageHeader
        title="لاگ فعالیت‌ها"
        description={`سابقه‌ی تغییراتی که مدیران در پنل انجام داده‌اند — ${formatNumber(list.total)} رکورد`}
      />

      <AdminFilters
        placeholder="شرح، نام مدیر یا IP…"
        selects={[
          { name: "entity", label: "بخش", options: ACTIVITY_ENTITY_OPTIONS },
          { name: "action", label: "عملیات", options: ACTIVITY_ACTION_OPTIONS },
        ]}
      />

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-start text-xs">
            <thead>
              <tr className={theadRowCls}>
                <th className="py-2.5 ps-3 pe-3 font-medium">زمان</th>
                <th className="py-2.5 pe-3 font-medium">مدیر</th>
                <th className="py-2.5 pe-3 font-medium">بخش</th>
                <th className="py-2.5 pe-3 font-medium">عملیات</th>
                <th className="py-2.5 pe-3 font-medium">شرح</th>
                <th className="py-2.5 pe-3 font-medium">IP</th>
              </tr>
            </thead>
            <tbody>
              {list.items.map((l) => {
                const meta = ACTIVITY_ACTION_META[l.action];
                return (
                  <tr key={l.id} className={trCls}>
                    <td className="whitespace-nowrap py-2.5 ps-3 pe-3 text-slate-600">{formatJalaliDateTime(l.createdAt)}</td>
                    <td className="py-2.5 pe-3 font-medium text-slate-800">{l.adminName}</td>
                    <td className="py-2.5 pe-3 text-slate-600">{ACTIVITY_ENTITY_LABELS[l.entity] ?? l.entity}</td>
                    <td className="py-2.5 pe-3">
                      <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${meta?.color ?? "bg-slate-100 text-slate-600"}`}>
                        {meta?.label ?? l.action}
                      </span>
                    </td>
                    <td className="py-2.5 pe-3 text-slate-700">{toFaDigits(l.summary)}</td>
                    <td className="py-2.5 pe-3 text-slate-400" dir="ltr">
                      <span className="block text-end">{l.ip ?? "—"}</span>
                    </td>
                  </tr>
                );
              })}
              {list.items.length === 0 && !list.loading && <EmptyRow colSpan={6}>فعالیتی ثبت نشده.</EmptyRow>}
            </tbody>
          </table>
        </div>
        <ListFooter list={list} />
      </Card>
    </div>
  );
}
