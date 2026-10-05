// تبدیل مختصات نقشه به آدرس (Reverse Geocoding) با API سازگار با Nominatim.
// پیش‌فرض: سرور عمومی OpenStreetMap (برای ترافیک کم). برای ترافیک بالا سرور اختصاصی راه بندازید
// و GEOCODE_URL رو تغییر بدید (شرایط استفاده: https://operations.osmfoundation.org/policies/nominatim/).
import "server-only";
import { getCity, getProvince } from "@code-plate/iran-cities";
import { normalizeText } from "@/lib/text";
import { toEnglishDigits } from "@/lib/phone";
import { isValidPostalCode } from "@/lib/validators";

const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX = 500;
const cache = new Map();

function cacheGet(key) {
  const hit = cache.get(key);
  if (!hit) return undefined;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(key);
    return undefined;
  }
  return hit.value;
}

function cacheSet(key, value) {
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value); // قدیمی‌ترین
  cache.set(key, { at: Date.now(), value });
}

// اسم کامل نوع معبر رو به شکل کوتاه و مرسومش تبدیل می‌کنه (خیابان ابراهیمی → خ. ابراهیمی)
function abbreviateWay(value) {
  return normalizeText(value)
    .replace(/^بلوار\s+/, "بل ")
    .replace(/^خیابان\s+/, "خ. ")
    .replace(/^کوچه‌?ی?\s+/, "ک. ")
    .replace(/^بزرگراه\s+/, "بزرگراه ")
    .replace(/^میدان\s+/, "میدان ");
}

function mapAddress(a = {}) {
  const stateName = normalizeText(a.state || a.province || "")
    .replace(/^استان\s+/, "")
    .replace(/\s+Province$/i, "");
  const province = stateName ? getProvince(stateName) : null;

  const cityName = normalizeText(a.city || a.town || a.village || a.municipality || a.county || "")
    .replace(/^شهرستان\s+/, "")
    .replace(/^شهر\s+/, "");
  const city = province && cityName ? getCity(cityName, province.en) : null;

  const postal = a.postcode ? toEnglishDigits(a.postcode).trim() : "";

  // محله: مشخص‌ترین سطح محلی که نومیناتیم برگردونده
  const neighborhoodRaw = normalizeText(a.neighbourhood || a.suburb || a.quarter || a.city_district || "");
  const neighborhood = neighborhoodRaw || null;

  // «آدرس کامل»: بقیه‌ی سطح‌های محلی (شهرک/ناحیه/...، غیر از چیزی که به‌عنوان «محله» انتخاب شد) + نام معبر،
  // پشت سر هم و با علامت اختصاری مرسوم (خ./بل) — چون کد پستی دقیق به‌ندرت از این سرویس درمیاد، خودِ متن آدرس
  // باید تا حد امکان قابل‌استفاده باشه تا کاربر فقط پلاک/واحد رو دستی اضافه کنه.
  const localityParts = [a.quarter, a.suburb, a.neighbourhood, a.city_district]
    .map((v) => normalizeText(v || ""))
    .filter((v) => v && v !== neighborhoodRaw);
  const uniqueLocalities = [...new Set(localityParts)];
  const roadPart = a.road ? abbreviateWay(a.road) : "";
  const addressLine = [...uniqueLocalities, roadPart].filter(Boolean).join("، ") || null;

  return {
    province: province?.fa ?? null,
    city: city?.fa ?? null,
    neighborhood,
    addressLine,
    plaque: normalizeText(a.house_number || "") || null,
    postalCode: isValidPostalCode(postal) ? postal : null,
  };
}

/** خروجی: { found, ...فیلدهای آدرس } — در خطای شبکه هم خطا پرتاب نمی‌کنه؛ کاربر می‌تونه دستی پر کنه */
export async function reverseGeocode(lat, lng) {
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  const cached = cacheGet(key);
  if (cached) return cached;

  const base = process.env.GEOCODE_URL || "https://nominatim.openstreetmap.org/reverse";
  const url = new URL(base);
  url.search = new URLSearchParams({
    format: "jsonv2",
    lat: String(lat),
    lon: String(lng),
    zoom: "18",
    addressdetails: "1",
    "accept-language": "fa",
  }).toString();

  try {
    const res = await fetch(url, {
      headers: {
        // Nominatim یک User-Agent معتبر می‌خواد؛ ترجیحاً با راه ارتباطی شما
        "User-Agent": process.env.GEOCODE_USER_AGENT || "sopermarket-shop/1.0",
        "Accept-Language": "fa",
      },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) throw new Error(`geocoder http ${res.status}`);
    const data = await res.json();
    const fields = mapAddress(data?.address);
    const found = Boolean(fields.province || fields.city || fields.addressLine);
    const result = { found, ...fields };
    if (found) cacheSet(key, result);
    return result;
  } catch (err) {
    console.error("[geocode error]", err instanceof Error ? err.message : err);
    return { found: false };
  }
}
