"use client";

import { FaCheck, FaDesktop, FaMoon, FaSun } from "react-icons/fa";
import { useTheme } from "@/components/providers/ThemeProvider";
import { PALETTE_BY_ID, DEFAULT_PALETTE } from "@/lib/palettes";

/**
 * انتخاب ظاهر سایت: سیستم (پیش‌فرض) / روشن / تاریک.
 * پیش‌نمایش‌ها عمداً با رنگ ثابت کشیده شدن (نه متغیرهای تم) تا همیشه همون ظاهر واقعی گزینه رو نشون بدن.
 */

// رنگ پیش‌نمایش‌ها از همون پالت پیش‌فرضِ lib/palettes.js می‌آد (دیگه کپی دستی نداریم)
const LIGHT = PALETTE_BY_ID[DEFAULT_PALETTE].light;
const DARK = PALETTE_BY_ID[DEFAULT_PALETTE].dark;

function MiniScreen({ c }) {
  return (
    <div className="h-full w-full p-2" style={{ background: c.bg }}>
      <div className="mb-1.5 flex items-center gap-1">
        <span className="h-2 w-2 rounded-full" style={{ background: c.brand }} />
        <span className="h-1.5 w-8 rounded-full" style={{ background: c.text, opacity: 0.8 }} />
      </div>
      <div className="rounded-md p-1.5" style={{ background: c.card, border: `1px solid ${c.line}` }}>
        <span className="mb-1 block h-1.5 w-10 rounded-full" style={{ background: c.text, opacity: 0.75 }} />
        <span className="mb-1.5 block h-1 w-14 rounded-full" style={{ background: c.mute }} />
        <span className="block h-3 w-full rounded" style={{ background: c.brand }} />
      </div>
    </div>
  );
}

function Preview({ value }) {
  if (value === "light") return <MiniScreen c={LIGHT} />;
  if (value === "dark") return <MiniScreen c={DARK} />;
  // سیستم: نیمه‌ی راست روشن، نیمه‌ی چپ تاریک
  return (
    <div className="relative h-full w-full">
      <div className="absolute inset-0">
        <MiniScreen c={LIGHT} />
      </div>
      <div className="absolute inset-0" style={{ clipPath: "polygon(0 0, 55% 0, 45% 100%, 0 100%)" }}>
        <MiniScreen c={DARK} />
      </div>
    </div>
  );
}

const OPTIONS = [
  { value: "system", label: "سیستم", hint: "هماهنگ با تنظیم دستگاه", icon: FaDesktop },
  { value: "light", label: "روشن", hint: "همیشه روشن", icon: FaSun },
  { value: "dark", label: "تاریک", hint: "همیشه تاریک", icon: FaMoon },
];

export default function AppearancePanel() {
  const { theme, resolved, setTheme } = useTheme();

  return (
    <div>
      <p className="mb-4 text-xs leading-6 text-slate-500">
        ظاهر سایت را انتخاب کنید. با گزینه‌ی «سیستم»، سایت خودکار با حالت روشن یا تاریک دستگاه شما عوض می‌شود.
      </p>

      <div role="radiogroup" aria-label="ظاهر سایت" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {OPTIONS.map(({ value, label, hint, icon: Icon }) => {
          const active = theme === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setTheme(value)}
              className={`group relative rounded-2xl border p-2.5 text-start transition active:scale-[0.99] ${
                active
                  ? "border-green-600 bg-green-50 shadow-brand ring-2 ring-green-600/30"
                  : "border-slate-200 bg-white hover:border-green-300 hover:shadow-soft"
              }`}
            >
              <div className="relative h-24 overflow-hidden rounded-xl border border-slate-200/80">
                <Preview value={value} />
              </div>

              <div className="mt-2.5 flex items-center gap-2 px-1 pb-0.5">
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition ${
                    active ? "bg-green-600 text-white" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  <Icon size={14} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-extrabold text-slate-800">{label}</span>
                  <span className="block truncate text-xs text-slate-500">{hint}</span>
                </span>
                {active && (
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-600 text-white">
                    <FaCheck size={10} />
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <p className="mt-4 rounded-xl bg-slate-50 px-3.5 py-2.5 text-xs leading-6 text-slate-500">
        الان ظاهر{" "}
        <span className="font-bold text-slate-700">{resolved === "dark" ? "تاریک" : "روشن"}</span>
        {theme === "system" ? " (طبق تنظیم دستگاه شما)" : ""} فعال است. این انتخاب فقط روی همین مرورگر ذخیره می‌شود.
      </p>
    </div>
  );
}
