"use client";

import { useEffect, useMemo, useState } from "react";
import { Select } from "@/components/ui/select";
import { Field, inputCls } from "@/components/ui/form";
import { JALALI_MONTHS, currentJalaliYear, isoToJalali, jalaliMonthLength, jalaliToIso } from "@/lib/jalali";
import { toFaDigits } from "@/lib/phone";

const MIN_AGE = 12;
const MAX_AGE = 100;

/**
 * value: تاریخ ISO ("1990-05-14") یا "". onChange با ISO یا "" صدا زده می‌شه.
 * چون سه <Select> جدا داریم، وضعیت روز/ماه/سال رو محلی نگه می‌داریم (نه فقط از روی value مشتق‌شده)؛
 * وگرنه تا سه‌تا با هم انتخاب نشن هیچ‌کدوم ذخیره نمی‌شه (چون تغییر یکی به بقیه هم نیاز داره).
 */
export default function JalaliDateField({ value, onChange, error }) {
  const [parts, setParts] = useState(() => isoToJalali(value));
  // اگه مقدار از بیرون عوض شد (مثلاً بارگذاری اولیه‌ی پروفایل)، با اون هماهنگ شو
  useEffect(() => {
    setParts(isoToJalali(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const { y, m, d } = parts;
  const thisYear = currentJalaliYear();

  const years = useMemo(
    () => Array.from({ length: MAX_AGE - MIN_AGE + 1 }, (_, i) => thisYear - MIN_AGE - i),
    [thisYear],
  );
  const days = useMemo(() => {
    const len = jalaliMonthLength(y, m);
    return Array.from({ length: len }, (_, i) => i + 1);
  }, [y, m]);

  function update(patch) {
    const next = { ...parts, ...patch };
    setParts(next);
    if (!next.y || !next.m || !next.d) {
      onChange("");
      return;
    }
    const clampedDay = Math.min(Number(next.d), jalaliMonthLength(next.y, next.m));
    const iso = jalaliToIso(next.y, next.m, clampedDay);
    onChange(iso ?? "");
  }

  const selectCls = `${inputCls(Boolean(error))} px-2 text-center`;

  return (
    <Field label="تاریخ تولد" error={error}>
      <div className="grid grid-cols-3 gap-2">
        <Select aria-label="روز" value={d} onChange={(e) => update({ d: e.target.value })} className={selectCls}>
          <option value="">روز</option>
          {days.map((n) => (
            <option key={n} value={n}>
              {toFaDigits(n)}
            </option>
          ))}
        </Select>
        <Select aria-label="ماه" value={m} onChange={(e) => update({ m: e.target.value })} className={selectCls}>
          <option value="">ماه</option>
          {JALALI_MONTHS.map((name, i) => (
            <option key={name} value={i + 1}>
              {name}
            </option>
          ))}
        </Select>
        <Select aria-label="سال" value={y} onChange={(e) => update({ y: e.target.value })} className={selectCls}>
          <option value="">سال</option>
          {years.map((n) => (
            <option key={n} value={n}>
              {toFaDigits(n)}
            </option>
          ))}
        </Select>
      </div>
    </Field>
  );
}
