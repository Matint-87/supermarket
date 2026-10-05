"use client";

// منوی انتخاب سفارشی (روی @radix-ui/react-select) به‌جای <select> ساده‌ی مرورگر.
// API عمداً مثل <select> بومیه: value / onChange(e) با e.target.value / disabled / id / aria-label
// و بچه‌ها همون <option>ها؛ پس برای عوض‌کردن فقط کافیه <select> رو به <Select> تبدیل کنی.
import { Children, Fragment, isValidElement } from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { FaCheck, FaChevronDown } from "react-icons/fa";
import { cn } from "@/lib/utils";

// Radix اجازه‌ی value="" برای آیتم‌ها نمی‌ده؛ مقدار خالی رو با یه نشانه جایگزین می‌کنیم
const EMPTY = "__empty__";

function textOf(node) {
  return Children.toArray(node)
    .map((c) => (typeof c === "string" || typeof c === "number" ? String(c) : isValidElement(c) ? textOf(c.props.children) : ""))
    .join("");
}

/** <option>ها رو (حتی داخل Fragment یا آرایه) به لیست {value,label,disabled} تبدیل می‌کنه */
function parseOptions(children, out = []) {
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    if (child.type === Fragment) return parseOptions(child.props.children, out);
    if (child.type === "option") {
      out.push({
        value: child.props.value === undefined ? textOf(child.props.children) : String(child.props.value),
        label: textOf(child.props.children),
        disabled: Boolean(child.props.disabled),
      });
    }
  });
  return out;
}

export function Select({ value, onChange, children, className, disabled, id, name, "aria-label": ariaLabel, contentClassName }) {
  const options = parseOptions(children);
  const current = String(value ?? "");
  const selected = options.find((o) => o.value === current);

  return (
    <SelectPrimitive.Root
      dir="rtl"
      value={current === "" ? EMPTY : current}
      onValueChange={(v) => onChange?.({ target: { value: v === EMPTY ? "" : v, name } })}
      disabled={disabled}
      name={name}
    >
      <SelectPrimitive.Trigger
        id={id}
        aria-label={ariaLabel}
        className={cn(
          "group flex cursor-pointer items-center justify-between gap-2 text-start disabled:cursor-not-allowed",
          className,
        )}
      >
        <span className="min-w-0 flex-1 truncate">
          <SelectPrimitive.Value>{selected ? selected.label : ""}</SelectPrimitive.Value>
        </span>
        <SelectPrimitive.Icon asChild>
          <FaChevronDown size={11} aria-hidden="true" className="shrink-0 opacity-60 transition group-data-[state=open]:rotate-180" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          dir="rtl"
          position="popper"
          sideOffset={6}
          collisionPadding={12}
          className={cn(
            "z-[200] max-h-72 min-w-(--radix-select-trigger-width) overflow-hidden rounded-2xl border border-slate-200 bg-white font-[Number] text-slate-800 shadow-pop",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
            contentClassName,
          )}
        >
          <SelectPrimitive.Viewport className="max-h-72 w-full min-w-(--radix-select-trigger-width) overflow-y-auto p-1.5">
            {options.map((o) => (
              <SelectPrimitive.Item
                key={o.value === "" ? EMPTY : o.value}
                value={o.value === "" ? EMPTY : o.value}
                disabled={o.disabled}
                className="relative flex cursor-pointer select-none items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm outline-none transition data-disabled:pointer-events-none data-disabled:opacity-40 data-highlighted:bg-green-50 data-highlighted:text-green-800 data-[state=checked]:font-bold data-[state=checked]:text-green-800"
              >
                <SelectPrimitive.ItemText>{o.label}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator>
                  <FaCheck size={11} className="text-green-600" />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
