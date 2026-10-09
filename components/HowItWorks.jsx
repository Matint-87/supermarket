import { FaCreditCard, FaSearch, FaTruck } from "react-icons/fa";
import Reveal from "@/components/Reveal";

// مراحل واقعاً پشت‌سرهمن (انتخاب ← ثبت و پرداخت ← دریافت)، پس شماره‌گذاری اینجا معنی داره
const STEPS = [
  {
    n: "۱",
    icon: FaSearch,
    title: "کالا رو انتخاب کن",
    text: "از قفسه‌ها بگرد یا اسم کالا رو جستجو کن و به سبد خرید اضافه‌ش کن.",
    from: "right", // اولین مرحله از سمت راست (شروع خوندن فارسی)
  },
  {
    n: "۲",
    icon: FaCreditCard,
    title: "سفارش رو ثبت کن",
    text: "آدرس و روش ارسال رو انتخاب کن و پرداخت رو انجام بده.",
    from: "bottom",
  },
  {
    n: "۳",
    icon: FaTruck,
    title: "سفارشت رو بگیر",
    text: "وضعیت سفارش رو از «سفارش‌های من» دنبال کن تا به دستت برسه.",
    from: "left", // آخرین مرحله از سمت چپ
  },
];

/** «سفارش چطور کار می‌کنه؟» — سه مرحله‌ی کوتاه؛ هر کارت از یک سمت وارد می‌شه */
export default function HowItWorks() {
  return (
    <section dir="rtl" aria-labelledby="how-title" className="px-0 py-2">
      <Reveal from="right">
        <h2 id="how-title" className="mb-5 flex items-center gap-2 text-base font-extrabold text-slate-800">
          <span aria-hidden="true" className="h-5 w-1.5 rounded-full bg-linear-to-b from-green-400 to-green-700" />
          سفارش دادن چطوریه؟
        </h2>
      </Reveal>

      <ol className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
        {STEPS.map(({ n, icon: Icon, title, text, from }, i) => (
          <Reveal as="li" key={n} from={from} delay={i * 90} className="relative">
            <div className="relative h-full overflow-hidden rounded-3xl bg-white p-5 shadow-soft ring-1 ring-slate-200/70">
              {/* عدد بزرگ و کمرنگ پشت کارت */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-6 end-3 select-none text-[96px] font-black leading-none text-green-100"
              >
                {n}
              </span>
              <span className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-green-100 text-green-700">
                <Icon size={19} />
              </span>
              <h3 className="relative mt-4 text-sm font-extrabold text-slate-800">{title}</h3>
              <p className="relative mt-1.5 max-w-64 text-xs leading-6 text-slate-500">{text}</p>
            </div>
          </Reveal>
        ))}
      </ol>
    </section>
  );
}
