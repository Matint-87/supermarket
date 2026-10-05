// خوندن/نوشتن تنظیمات فروشگاه از جدول settings (key/value با مقدار JSON)
import "server-only";
import { cache } from "react";
import {
  SHIPPING_SETTINGS_DEFAULTS,
  SHIPPING_SETTINGS_KEY,
  STORE_STATUS_DEFAULTS,
  STORE_STATUS_KEY,
} from "@/lib/admin-constants";
import { prisma } from "@/lib/db";
import { DEFAULT_PALETTE, SITE_PALETTE_KEY, normalizePalette } from "@/lib/palettes";

/** تنظیمات ارسال؛ فیلدهایی که ذخیره نشدن با مقدار پیش‌فرض پر می‌شن */
export async function getShippingSettings() {
  const row = await prisma.setting.findUnique({ where: { key: SHIPPING_SETTINGS_KEY } });
  const stored = row && typeof row.value === "object" && row.value ? row.value : {};
  return { ...SHIPPING_SETTINGS_DEFAULTS, ...stored };
}

export function saveShippingSettings(value) {
  return prisma.setting.upsert({
    where: { key: SHIPPING_SETTINGS_KEY },
    create: { key: SHIPPING_SETTINGS_KEY, value },
    update: { value },
  });
}

/** وضعیت باز/بسته‌ی فروشگاه؛ اگه هنوز ذخیره نشده، «باز» برمی‌گرده */
export async function getStoreStatus() {
  const row = await prisma.setting.findUnique({ where: { key: STORE_STATUS_KEY } });
  const stored = row && typeof row.value === "object" && row.value ? row.value : {};
  const merged = { ...STORE_STATUS_DEFAULTS, ...stored };
  return {
    open: merged.open !== false,
    closedMessage: String(merged.closedMessage || "").trim() || STORE_STATUS_DEFAULTS.closedMessage,
  };
}

export function saveStoreStatus(value) {
  return prisma.setting.upsert({
    where: { key: STORE_STATUS_KEY },
    create: { key: STORE_STATUS_KEY, value },
    update: { value },
  });
}

/** پالت رنگی سایت؛ اگه هنوز انتخاب نشده (یا نامعتبره) پالت پیش‌فرض برمی‌گرده */
// cache: توی یک درخواست، layout و generateViewport هر دو صدا می‌زنن ولی فقط یک بار از دیتابیس می‌خونه
export const getSitePalette = cache(async function getSitePalette() {
  try {
    const row = await prisma.setting.findUnique({ where: { key: SITE_PALETTE_KEY } });
    const stored = row && typeof row.value === "object" && row.value ? row.value : {};
    return normalizePalette(stored.palette ?? DEFAULT_PALETTE);
  } catch (err) {
    // اگه دیتابیس در دسترس نبود، سایت با ظاهر پیش‌فرض بالا بیاد
    console.error("[site-palette]", err);
    return DEFAULT_PALETTE;
  }
});

export function saveSitePalette(palette) {
  const value = { palette: normalizePalette(palette) };
  return prisma.setting.upsert({
    where: { key: SITE_PALETTE_KEY },
    create: { key: SITE_PALETTE_KEY, value },
    update: { value },
  });
}
