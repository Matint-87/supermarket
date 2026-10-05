"use client";

import Link from "next/link";
import { getProvincesList } from "@code-plate/iran-cities";
import AdminFilters from "@/components/admin/AdminFilters";
import ListFooter from "@/components/admin/ListFooter";
import { useInfiniteList } from "@/components/admin/useInfiniteList";
import { Card, EmptyRow, PageHeader, theadRowCls, trCls } from "@/components/admin/ui";
import { formatNumber } from "@/lib/format";
import { toFaDigits } from "@/lib/phone";

const PROVINCE_OPTIONS = getProvincesList()
  .sort((a, b) => a.fa.localeCompare(b.fa, "fa"))
  .map((p) => ({ value: p.fa, label: p.fa }));

export default function AddressesAdmin({ filters, initial }) {
  const list = useInfiniteList({ endpoint: "/api/admin/addresses", itemsKey: "addresses", filters, initial });

  return (
    <div>
      <PageHeader
        title="آدرس‌ها"
        description={`آدرس‌های ثبت‌شده‌ی کاربران — ${formatNumber(list.total)} آدرس`}
      />

      <AdminFilters
        placeholder="گیرنده، موبایل، شهر، کد پستی یا کاربر…"
        selects={[{ name: "province", label: "استان", options: PROVINCE_OPTIONS }]}
      />

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-start text-xs">
            <thead>
              <tr className={theadRowCls}>
                <th className="py-2.5 ps-3 pe-3 font-medium">کاربر</th>
                <th className="py-2.5 pe-3 font-medium">گیرنده</th>
                <th className="py-2.5 pe-3 font-medium">آدرس</th>
                <th className="py-2.5 pe-3 font-medium">کد پستی</th>
              </tr>
            </thead>
            <tbody>
              {list.items.map((a) => (
                <tr key={a.id} className={`${trCls} align-top`}>
                  <td className="py-3 ps-3 pe-3">
                    <Link href={`/admin/users/${a.user.id}`} className="font-medium text-slate-800 hover:text-green-700">
                      {a.user.name}
                    </Link>
                    <p className="mt-0.5 text-slate-500" dir="ltr">
                      <span className="block text-end">{toFaDigits(a.user.phone)}</span>
                    </p>
                  </td>
                  <td className="py-3 pe-3 text-slate-600">
                    {a.recipientName}
                    <p className="mt-0.5 text-slate-500">{toFaDigits(a.recipientPhone)}</p>
                  </td>
                  <td className="py-3 pe-3 leading-6 text-slate-600">
                    {a.label && <span className="me-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">{a.label}</span>}
                    {a.isDefault && <span className="me-1.5 rounded-full bg-green-50 px-2 py-0.5 text-[11px] text-green-700">پیش‌فرض</span>}
                    {a.province}، {a.city}
                    {a.neighborhood ? `، ${a.neighborhood}` : ""}، {a.addressLine}
                    {a.plaque ? `، پلاک ${toFaDigits(a.plaque)}` : ""}
                    {a.unit ? `، واحد ${toFaDigits(a.unit)}` : ""}
                  </td>
                  <td className="py-3 pe-3 text-slate-600">{toFaDigits(a.postalCode)}</td>
                </tr>
              ))}
              {list.items.length === 0 && !list.loading && <EmptyRow colSpan={4}>آدرسی پیدا نشد.</EmptyRow>}
            </tbody>
          </table>
        </div>
        <ListFooter list={list} />
      </Card>
    </div>
  );
}
