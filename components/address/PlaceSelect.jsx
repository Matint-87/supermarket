"use client";

import { useMemo } from "react";
import { Select } from "@/components/ui/select";
import { getCities, getProvincesList } from "@code-plate/iran-cities";
import { Field, inputCls } from "@/components/ui/form";

const PROVINCES = getProvincesList().sort((a, b) => a.fa.localeCompare(b.fa, "fa"));

export function ProvinceSelect({ value, onChange, error }) {
  return (
    <Field label="استان" htmlFor="province" error={error} required>
      <Select
        id="province"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls(Boolean(error))}
      >
        <option value="">انتخاب کنید</option>
        {PROVINCES.map((p) => (
          <option key={p.en} value={p.fa}>
            {p.fa}
          </option>
        ))}
      </Select>
    </Field>
  );
}

export function CitySelect({ province, value, onChange, error }) {
  const cities = useMemo(() => {
    if (!province) return [];
    const found = PROVINCES.find((p) => p.fa === province);
    return found ? getCities(found.en).sort((a, b) => a.fa.localeCompare(b.fa, "fa")) : [];
  }, [province]);

  return (
    <Field label="شهر" htmlFor="city" error={error} required>
      <Select
        id="city"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={!province}
        className={inputCls(Boolean(error))}
      >
        <option value="">{province ? "انتخاب کنید" : "ابتدا استان را انتخاب کنید"}</option>
        {cities.map((c) => (
          <option key={c.en} value={c.fa}>
            {c.fa}
          </option>
        ))}
      </Select>
    </Field>
  );
}
