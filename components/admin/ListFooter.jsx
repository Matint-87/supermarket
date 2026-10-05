"use client";

import { Spinner } from "@/components/ui/form";
import { formatNumber } from "@/lib/format";
import { ADMIN_LOAD_SIZE } from "@/lib/admin-constants";

/**
 * پاورقی لیست‌های لود تنبل: سنسور اسکرول + وضعیت (در حال لود / خطا با تلاش دوباره / پایان لیست) + شمارنده.
 * `list` همون خروجی useInfiniteList هست.
 */
export default function ListFooter({ list }) {
  const { items, total, hasMore, loading, error, sentinelRef, loadMore } = list;
  if (total === 0 && !loading && !error) return null;

  return (
    <div className="mt-3 flex flex-col items-center gap-2 py-2 text-xs text-slate-500">
      {error ? (
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-red-600">{error}</p>
          <button
            type="button"
            onClick={loadMore}
            className="rounded-full bg-white px-4 py-1.5 font-bold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
          >
            تلاش دوباره
          </button>
        </div>
      ) : loading ? (
        <span className="flex items-center gap-2 text-green-700">
          <Spinner /> در حال بارگذاری…
        </span>
      ) : hasMore ? (
        <button
          type="button"
          onClick={loadMore}
          className="rounded-full bg-white px-4 py-1.5 font-bold text-green-700 ring-1 ring-green-200 transition hover:bg-green-50"
        >
          نمایش {formatNumber(ADMIN_LOAD_SIZE)} مورد بعدی
        </button>
      ) : null}

      {/* سنسور انتهای لیست: وقتی دیده بشه یعنی اسکرول به آخر رسیده */}
      {hasMore && <div ref={sentinelRef} aria-hidden="true" className="h-px w-full" />}

      <p>
        {hasMore
          ? `${formatNumber(items.length)} از ${formatNumber(total)} مورد نمایش داده شد`
          : `همه‌ی ${formatNumber(items.length)} مورد نمایش داده شد`}
      </p>
    </div>
  );
}
