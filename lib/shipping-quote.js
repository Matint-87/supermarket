// محاسبه‌ی هزینه و زمان ارسال از روی «محدوده‌های ارسال» و «تنظیمات ارسال» پنل مدیریت.
// هم API عمومی /api/shipping/quote (نمایش توی سبد) و هم ثبت سفارش (قیمت واقعی، سمت سرور) از همین‌جا استفاده می‌کنن.
import "server-only";
import { prisma } from "@/lib/db";
import { getShippingSettings } from "@/lib/settings";
import { SHIPPING_METHODS, isTehranCity } from "@/lib/shipping";
import { normalizeText } from "@/lib/text";

const same = (a, b) => normalizeText(a) === normalizeText(b);

/** مشخص‌ترین محدوده‌ی فعال: شهر مشخص > استان > کل کشور؛ در تساوی، sortOrder کوچک‌تر */
function matchZone(zones, province, city) {
  let best = null;
  let bestScore = -1;
  for (const z of zones) {
    if (z.province && !same(z.province, province)) continue;
    const hasCities = (z.cities ?? []).length > 0;
    if (hasCities && !z.cities.some((c) => same(c, city))) continue;
    const score = hasCities ? 2 : z.province ? 1 : 0;
    if (score > bestScore) {
      best = z;
      bestScore = score;
    }
  }
  return best;
}

/**
 * @param {{province: string, city: string, itemsPayable: number}} args  itemsPayable = جمع کالاها بعد از تخفیف
 * @returns {Promise<{methods: Array, pickupAddress: string, note: string}>}
 */
export async function quoteShipping({ province, city, itemsPayable }) {
  const [settings, zones] = await Promise.all([
    getShippingSettings(),
    prisma.shippingZone.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
  ]);

  const zone = matchZone(zones, province, city);
  const baseFee = zone ? zone.fee : settings.defaultFee;
  // ارسال رایگان: سقفِ همون محدوده؛ اگه محدوده‌ای پیدا نشد سقفِ عمومی (صفر = نداریم)
  const freeOver = zone ? zone.freeOver : settings.freeShippingOver > 0 ? settings.freeShippingOver : null;
  const isFree = baseFee === 0 || (freeOver != null && itemsPayable >= freeOver);
  const shipFee = isFree ? 0 : baseFee;

  const fallbackTime = isTehranCity(city) ? settings.tehranDeliveryTime : settings.otherDeliveryTime;
  const deliveryTime = zone?.deliveryTime || fallbackTime || null;

  const enabled = { POST: settings.postEnabled, COURIER: settings.courierEnabled, PICKUP: settings.pickupEnabled };
  const methods = SHIPPING_METHODS.map((m) => ({
    value: m.value,
    label: m.label,
    description: m.description,
    enabled: Boolean(enabled[m.value]),
    fee: m.value === "PICKUP" ? 0 : shipFee,
    // فقط وقتی «رایگان» نشون داده می‌شه که واقعاً هزینه‌ای بوده و حذف شده
    freeApplied: m.value !== "PICKUP" && baseFee > 0 && isFree,
    freeOver: m.value !== "PICKUP" ? freeOver : null,
    deliveryTime: m.value === "PICKUP" ? null : deliveryTime,
  }));

  return { methods, pickupAddress: settings.pickupAddress || "", note: settings.note || "" };
}

/** برای ثبت سفارش: یک روش مشخص رو چک می‌کنه (فعال بودن) و هزینه/زمانش رو برمی‌گردونه */
export async function quoteForMethod({ method, province, city, itemsPayable }) {
  const q = await quoteShipping({ province, city, itemsPayable });
  const m = q.methods.find((x) => x.value === method);
  return m && m.enabled ? m : null;
}
