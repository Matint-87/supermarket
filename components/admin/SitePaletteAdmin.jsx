"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FaCheck, FaMoon, FaSun } from "react-icons/fa";
import { Card, PageHeader } from "@/components/admin/ui";
import { Spinner, btnPrimary } from "@/components/ui/form";
import { api } from "@/lib/api-client";
import { PALETTES } from "@/lib/palettes";
import { notify } from "@/lib/toast";
import { cn } from "@/lib/utils";

/** پیش‌نمایش کوچک یک صفحه با رنگ‌های ثابت (نه متغیرهای تم) تا همیشه همون ظاهر واقعی پالت رو نشون بده */
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

function Swatches({ colors }) {
  return (
    <div className="flex overflow-hidden rounded-lg ring-1 ring-black/10" dir="ltr">
      {colors.map((hex) => (
        <span key={hex} className="h-6 flex-1" style={{ background: hex }} title={hex} />
      ))}
    </div>
  );
}

/** صفحه‌ی «پالت رنگی سایت»: ادمین یکی از پالت‌ها رو انتخاب می‌کنه؛ هر پالت تم روشن و تاریک خودش رو داره */
export default function SitePaletteAdmin({ initial }) {
  const router = useRouter();
  const [saved, setSaved] = useState(initial);
  const [selected, setSelected] = useState(initial);
  const [busy, setBusy] = useState(false);
  const changed = selected !== saved;

  async function save() {
    setBusy(true);
    try {
      const data = await api("PUT", "/api/admin/site-palette", { palette: selected });
      setSaved(data.palette);
      setSelected(data.palette);
      notify.success("پالت رنگی سایت عوض شد.");
      // لایه‌ی اصلی رو دوباره از سرور بگیر تا رنگ همین پنل هم همون لحظه عوض بشه
      router.refresh();
    } catch (err) {
      notify.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="پالت رنگی سایت"
        description="رنگ‌بندی کل سایت (فروشگاه و پنل مدیریت) رو از اینجا عوض کن. هر پالت حالت روشن و تاریک خودش رو داره."
      />

      <Card title="انتخاب پالت">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {PALETTES.map((p) => {
            const active = selected === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelected(p.id)}
                aria-pressed={active}
                className={cn(
                  "relative rounded-2xl border-2 p-3 text-start transition",
                  active ? "border-green-600 bg-green-50/60 shadow-soft" : "border-slate-200 bg-white hover:border-green-300",
                )}
              >
                {active && (
                  <span className="absolute end-3 top-3 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-green-600 text-white">
                    <FaCheck size={11} />
                  </span>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="mb-1 flex items-center gap-1 text-[11px] text-slate-500">
                      <FaSun size={10} /> روشن
                    </div>
                    <div className="aspect-4/3 overflow-hidden rounded-lg border border-slate-200">
                      <MiniScreen c={p.light} />
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 flex items-center gap-1 text-[11px] text-slate-500">
                      <FaMoon size={10} /> تاریک
                    </div>
                    <div className="aspect-4/3 overflow-hidden rounded-lg border border-slate-200">
                      <MiniScreen c={p.dark} />
                    </div>
                  </div>
                </div>

                <div className="mt-3 space-y-1.5">
                  <Swatches colors={p.light.swatches} />
                  <Swatches colors={p.dark.swatches} />
                </div>

                <p className="mt-3 text-sm font-extrabold text-slate-800">{p.label}</p>
                <p className="mt-0.5 text-xs text-slate-500" dir="ltr">
                  {p.description}
                </p>
                {saved === p.id && <p className="mt-1.5 text-[11px] font-bold text-green-700">پالت فعلی سایت</p>}
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button type="button" onClick={save} disabled={busy || !changed} className={cn(btnPrimary, "w-auto px-8")}>
            {busy && <Spinner />}
            ذخیره و اعمال روی سایت
          </button>
          {changed && (
            <button type="button" onClick={() => setSelected(saved)} className="text-xs text-slate-500 underline">
              انصراف
            </button>
          )}
        </div>
        <p className="mt-3 text-xs leading-6 text-slate-500">
          انتخاب شما روی همه‌ی بازدیدکننده‌ها اعمال می‌شود. حالت روشن/تاریک همچنان توسط خود کاربر (پروفایل ← ظاهر سایت) انتخاب می‌شود و
          هر پالت، نسخه‌ی تاریک مخصوص خودش را دارد.
        </p>
      </Card>
    </div>
  );
}
