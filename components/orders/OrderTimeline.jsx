import { FaBoxOpen, FaCheck, FaClipboardCheck, FaHome, FaStore, FaTimes, FaTruck, FaUndoAlt } from "react-icons/fa";
import { formatJalaliDateTime } from "@/lib/jalali";

/**
 * تایم‌لاین پیگیری سفارش برای مشتری.
 * مراحل از روی status و زمان‌های ثبت‌شده‌ی سفارش ساخته می‌شن؛ مرحله‌ای که زمانش ثبت نشده (مثلاً ادمین
 * از «در انتظار» مستقیم به «ارسال» رفته) فقط «طی‌شده» نشون داده می‌شه، بدون ساعت.
 */

const FLOW = ["PENDING", "PROCESSING", "SHIPPING", "DELIVERED"];

function buildSteps(order) {
  const pickup = order.shippingMethod === "PICKUP";
  const base = [
    { key: "PENDING", label: "ثبت سفارش", icon: FaClipboardCheck, at: order.createdAt },
    { key: "PROCESSING", label: "آماده‌سازی", icon: FaBoxOpen, at: order.processingAt },
    {
      key: "SHIPPING",
      label: pickup ? "آماده‌ی تحویل" : order.shippingMethod === "COURIER" ? "تحویل به پیک" : "ارسال با پست",
      icon: pickup ? FaStore : FaTruck,
      at: order.shippedAt,
    },
    { key: "DELIVERED", label: "تحویل شد", icon: FaHome, at: order.deliveredAt },
  ];

  if (order.status === "CANCELED") {
    return {
      steps: [
        { ...base[0], state: "done" },
        { key: "CANCELED", label: "لغو شد", icon: FaTimes, at: order.canceledAt, state: "canceled" },
      ],
    };
  }

  if (order.status === "RETURNED") {
    return {
      steps: [
        ...base.map((s) => ({ ...s, state: "done" })),
        { key: "RETURNED", label: "مرجوع شد", icon: FaUndoAlt, at: null, state: "returned" },
      ],
    };
  }

  const current = FLOW.indexOf(order.status);
  return {
    steps: base.map((s, i) => ({
      ...s,
      // آخرین مرحله (تحویل‌شده) وقتی رسیدیم، «طی‌شده» حساب می‌شه نه «در جریان»
      state: i < current || (i === current && order.status === "DELIVERED") ? "done" : i === current ? "current" : "todo",
    })),
  };
}

const CIRCLE = {
  done: "bg-green-600 text-white",
  current: "bg-white text-green-700 ring-2 ring-green-600",
  todo: "bg-slate-100 text-slate-400",
  canceled: "bg-red-600 text-white",
  returned: "bg-slate-500 text-white",
};

const LABEL = {
  done: "text-slate-800",
  current: "text-green-800",
  todo: "text-slate-400",
  canceled: "text-red-700",
  returned: "text-slate-700",
};

function StepTime({ at }) {
  if (!at) return null;
  // «۱۴ دی ۱۴۰۴ — ۱۴:۳۰» → تاریخ و ساعت در دو خط تا توی ستون باریک جا بشه
  const [date, time] = formatJalaliDateTime(at).split(" — ");
  return (
    <span className="mt-0.5 block text-[11px] leading-4 text-slate-500">
      {date}
      {time && (
        <>
          <br />
          {time}
        </>
      )}
    </span>
  );
}

export default function OrderTimeline({ order }) {
  const { steps } = buildSteps(order);

  return (
    <ol aria-label="مراحل پیگیری سفارش" className="mb-3 flex rounded-xl bg-slate-50 px-1 py-3.5">
      {steps.map((step, i) => {
        const Icon = step.state === "done" ? FaCheck : step.icon;
        const isLast = i === steps.length - 1;
        // خطِ اتصال به مرحله‌ی بعد: سبز اگه مرحله‌ی بعد هم طی‌شده یا در جریانه
        const next = steps[i + 1];
        const lineActive = next && (next.state === "done" || next.state === "current");
        const lineDead = next && (next.state === "canceled" || next.state === "returned");

        return (
          <li
            key={step.key}
            aria-current={step.state === "current" ? "step" : undefined}
            className="relative flex min-w-0 flex-1 flex-col items-center text-center"
          >
            {!isLast && (
              <span
                aria-hidden="true"
                className={`absolute start-1/2 top-3.5 h-0.5 w-full ${
                  lineDead ? "bg-red-300" : lineActive ? "bg-green-600" : "bg-slate-200"
                }`}
              />
            )}
            <span className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full ${CIRCLE[step.state]}`}>
              <Icon size={12} />
            </span>
            <span className={`mt-1.5 px-0.5 text-xs font-bold leading-4 ${LABEL[step.state]}`}>{step.label}</span>
            {step.state !== "todo" && <StepTime at={step.at} />}
          </li>
        );
      })}
    </ol>
  );
}
