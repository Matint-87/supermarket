// اجزای ظاهری مشترک پنل مدیریت (بدون hook؛ هم توی سرور و هم کلاینت قابل استفاده‌ان)
import { ORDER_STATUS_META, ROLE_LABELS } from "@/lib/admin-constants";
import { Card as ShadCard } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import BackButton from "@/components/BackButton";

export function PageHeader({ title, description, children }) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        {/* دکمه‌ی بازگشت گرد و بدون نوشته، کنار عنوان صفحه (توی داشبورد نمایش داده نمی‌شه) */}
        <BackButton fallback="/admin" hideOn={["/admin"]} className="mt-0.5 h-9 w-9" />
        <div className="min-w-0">
          <h1 className="text-lg font-extrabold tracking-tight text-slate-800 sm:text-xl">{title}</h1>
          {description && <p className="mt-1 text-xs leading-6 text-slate-500">{description}</p>}
        </div>
      </div>
      {children && <div className="flex flex-wrap items-center gap-2 [&>a]:flex-1 [&>button]:flex-1 sm:[&>a]:flex-none sm:[&>button]:flex-none">{children}</div>}
    </div>
  );
}

export function Card({ title, children, className = "" }) {
  return (
    <ShadCard className={cn("p-4 sm:p-5", className)}>
      {title && <h2 className="mb-3 text-sm font-extrabold text-slate-800">{title}</h2>}
      {children}
    </ShadCard>
  );
}

export function OrderStatusBadge({ status }) {
  const meta = ORDER_STATUS_META[status];
  return <Badge className={cn("font-bold", meta?.color ?? "bg-slate-100 text-slate-600")}>{meta?.label ?? status}</Badge>;
}

export function ActiveBadge({ active, on = "فعال", off = "غیرفعال" }) {
  return (
    <Badge variant={active ? "success" : "secondary"}>
      <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-slate-400"}`} />
      {active ? on : off}
    </Badge>
  );
}

export function RoleBadge({ role }) {
  return <Badge variant={role === "ADMIN" ? "violet" : "secondary"}>{ROLE_LABELS[role] ?? role}</Badge>;
}

/** دایره‌ی آواتار: عکس کاربر یا حرف اول نام */
export function UserAvatar({ user, size = 36 }) {
  const initial = (user?.firstName || user?.phone || "؟").trim().charAt(0);
  return (
    <div
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-linear-to-br from-green-50 to-green-100 text-xs font-bold text-green-700 ring-1 ring-green-200"
      style={{ width: size, height: size }}
    >
      {user?.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.avatarUrl} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
      ) : (
        initial
      )}
    </div>
  );
}

export const tableWrap = "overflow-x-auto";
export const thCls = "py-2.5 pe-3 font-medium";
export const tdCls = "py-2.5 pe-3";

/** کلاس‌های مشترک جدول‌ها: سربرگ محو، ردیف با هاور و انیمیشن ورود (برای دسته‌های لود تنبل) */
export const theadRowCls = "border-b border-slate-200 bg-slate-50/70 text-slate-500";
export const trCls = "animate-fade-up border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50/70";

/** وضعیت خالی لیست‌ها (وقتی فیلتر یا جست‌وجو نتیجه‌ای نداره) */
export function EmptyRow({ colSpan, children }) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-10 text-center text-xs text-slate-400">
        {children}
      </td>
    </tr>
  );
}
