// اعتبارسنجی ورودی‌های API با zod.
// خطاها به شکل {فیلد: پیام} به کلاینت برمی‌گردن (handler در lib/api.js این کار رو می‌کنه).
import "server-only";
import { PALETTE_IDS } from "@/lib/palettes";
import { z } from "zod";
import { getCity, getProvince } from "@code-plate/iran-cities";
import { normalizeMobile, toEnglishDigits } from "@/lib/phone";
import { normalizeText } from "@/lib/text";
import {
  EMAIL_REGEX,
  NAME_REGEX,
  isInIran,
  isValidNationalCode,
  isValidPostalCode,
} from "@/lib/validators";
import { OTP_LENGTH } from "@/lib/auth-constants";
import { MAX_CART_LINES, MAX_QTY_PER_ITEM, PRODUCT_UNITS } from "@/lib/product-constants";
import { SHIPPING_METHOD_VALUES } from "@/lib/shipping";
import { PAYMENT_METHOD_VALUES, TRANSACTION_STATUS_VALUES, TRANSACTION_TYPE_VALUES } from "@/lib/admin-constants";
import { CANCEL_REASON_MAX, CANCEL_REASON_MIN } from "@/lib/order-constants";

// ───────────── اجزای مشترک ─────────────

export const mobileSchema = (message = "شماره موبایل معتبر نیست (مثال: ۰۹۱۲۳۴۵۶۷۸۹)") =>
  z
    .string({ error: "شماره موبایل را وارد کنید" })
    .transform((v) => normalizeMobile(v))
    .refine((v) => v !== null, { message });

const nameField = (label) =>
  z
    .string({ error: `${label} را وارد کنید` })
    .transform(normalizeText)
    .refine((v) => NAME_REGEX.test(v), {
      message: `${label} معتبر نیست (فقط حروف، ۲ تا ۵۰ کاراکتر)`,
    });

/** متن اختیاری: رشته‌ی خالی/undefined → null */
const optionalText = (max, label) =>
  z
    .string()
    .nullish()
    .transform((v) => normalizeText(v) || null)
    .refine((v) => v === null || v.length <= max, {
      message: `${label} حداکثر ${max} کاراکتر باشد`,
    });

function isValidIsoDate(v) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v) return false;
  return d.getUTCFullYear() >= 1900 && d.getTime() <= Date.now();
}

// ───────────── احراز هویت ─────────────

export const startSchema = z.object({ phone: mobileSchema() });

export const otpPurposeSchema = z.enum(["LOGIN", "RESET_PASSWORD"], {
  error: "درخواست نامعتبر است",
});

export const otpSendSchema = z.object({
  phone: mobileSchema(),
  purpose: otpPurposeSchema.default("LOGIN"),
});

export const otpVerifySchema = z.object({
  phone: mobileSchema(),
  purpose: otpPurposeSchema.default("LOGIN"),
  code: z
    .string({ error: "کد تأیید را وارد کنید" })
    .transform((v) => toEnglishDigits(v).replace(/\s/g, ""))
    .refine((v) => new RegExp(`^\\d{${OTP_LENGTH}}$`).test(v), {
      message: `کد تأیید باید ${OTP_LENGTH} رقم باشد`,
    }),
});

export const loginSchema = z.object({
  phone: mobileSchema(),
  password: z.string({ error: "رمز عبور را وارد کنید" }).min(1, "رمز عبور را وارد کنید").max(100),
});

export const setPasswordSchema = z.object({
  password: z.string({ error: "رمز عبور را وارد کنید" }),
});

// ───────────── پروفایل ─────────────

export const profileSchema = z.object({
  firstName: nameField("نام"),
  lastName: nameField("نام خانوادگی"),
  email: z
    .string()
    .nullish()
    .transform((v) => (v ? v.trim().toLowerCase() : null))
    .refine((v) => v === null || (v.length <= 120 && EMAIL_REGEX.test(v)), {
      message: "ایمیل معتبر نیست",
    }),
  nationalCode: z
    .string()
    .nullish()
    .transform((v) => (v ? toEnglishDigits(v).trim() : null))
    .refine((v) => v === null || isValidNationalCode(v), { message: "کد ملی معتبر نیست" }),
  birthDate: z
    .string()
    .nullish()
    .transform((v) => v || null)
    .refine((v) => v === null || isValidIsoDate(v), { message: "تاریخ تولد معتبر نیست" }),
  gender: z
    .enum(["MALE", "FEMALE"], { error: "جنسیت نامعتبر است" })
    .nullish()
    .transform((v) => v ?? null),
  smsPromoOptIn: z.boolean().default(false),
});

// ───────────── آدرس ─────────────

/** نام استان/شهر رو با فهرست رسمی تطبیق می‌ده و نام استاندارد رو برمی‌گردونه (یا null) */
export function resolvePlace(provinceInput, cityInput) {
  const province = getProvince(normalizeText(provinceInput));
  if (!province) return { province: null, city: null };
  const city = getCity(normalizeText(cityInput), province.en);
  return { province: province.fa, city: city ? city.fa : null };
}

export const addressSchema = z
  .object({
    label: optionalText(30, "عنوان آدرس"),
    recipientName: nameField("نام گیرنده"),
    recipientPhone: mobileSchema("شماره موبایل گیرنده معتبر نیست"),
    province: z.string({ error: "استان را انتخاب کنید" }).min(1, "استان را انتخاب کنید"),
    city: z.string({ error: "شهر را انتخاب کنید" }).min(1, "شهر را انتخاب کنید"),
    neighborhood: optionalText(80, "محله"),
    addressLine: z
      .string({ error: "آدرس را وارد کنید" })
      .transform(normalizeText)
      .refine((v) => v.length >= 10 && v.length <= 300, {
        message: "آدرس باید بین ۱۰ تا ۳۰۰ کاراکتر باشد",
      }),
    plaque: optionalText(10, "پلاک"),
    unit: optionalText(10, "واحد"),
    postalCode: z
      .string({ error: "کد پستی را وارد کنید" })
      .transform((v) => toEnglishDigits(v).trim())
      .refine(isValidPostalCode, { message: "کد پستی ۱۰ رقمی معتبر نیست" }),
    latitude: z.number().nullish().transform((v) => v ?? null),
    longitude: z.number().nullish().transform((v) => v ?? null),
    isDefault: z.boolean().default(false),
  })
  .superRefine((v, ctx) => {
    const { province, city } = resolvePlace(v.province, v.city);
    if (!province) {
      ctx.addIssue({ code: "custom", path: ["province"], message: "استان معتبر نیست" });
    } else if (!city) {
      ctx.addIssue({ code: "custom", path: ["city"], message: "این شهر متعلق به استان انتخاب‌شده نیست" });
    }
    const hasLat = v.latitude !== null;
    const hasLng = v.longitude !== null;
    if (hasLat !== hasLng) {
      ctx.addIssue({ code: "custom", path: ["latitude"], message: "موقعیت روی نقشه ناقص است" });
    } else if (hasLat && !isInIran(v.latitude, v.longitude)) {
      ctx.addIssue({ code: "custom", path: ["latitude"], message: "موقعیت انتخاب‌شده خارج از ایران است" });
    }
  })
  .transform((v) => ({ ...v, ...resolvePlace(v.province, v.city) }));

export const uuidSchema = z.string().regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
);

/** آدرس عکس: خالی، عکس آپلودشده‌ی خودمون (/api/images/…)، فایل قدیمی /uploads/… یا یه آدرس https */
const IMAGE_URL_OK = /^(\/api\/images\/[0-9a-f-]{36}|\/uploads\/[\w./-]+|https:\/\/[^\s"'<>]+)$/i;
const optionalImageUrl = z
  .string()
  .max(500)
  .nullish()
  .transform((v) => v || null)
  .refine((v) => v === null || (IMAGE_URL_OK.test(v) && !v.includes("..")), { message: "آدرس عکس معتبر نیست" });

// ───────────── دسته‌بندی محصولات ─────────────

export const categorySchema = z.object({
  name: z
    .string({ error: "نام دسته را وارد کنید" })
    .transform(normalizeText)
    .refine((v) => v.length >= 2 && v.length <= 40, { message: "نام دسته باید بین ۲ تا ۴۰ کاراکتر باشد" }),
  imageUrl: optionalImageUrl,
  sortOrder: z.coerce.number().int().default(0),
  isActive: z.boolean().default(true),
});

// ───────────── برند ─────────────

export const brandSchema = z.object({
  name: z
    .string({ error: "نام برند را وارد کنید" })
    .transform(normalizeText)
    .refine((v) => v.length >= 2 && v.length <= 60, { message: "نام برند باید بین ۲ تا ۶۰ کاراکتر باشد" }),
  imageUrl: optionalImageUrl,
  isActive: z.boolean().default(true),
});

// ───────────── محصول ─────────────

const productUnitValues = PRODUCT_UNITS.map((u) => u.value);

export const productSchema = z.object({
  categoryId: uuidSchema,
  brandId: uuidSchema.nullish().transform((v) => v || null),
  name: z
    .string({ error: "نام محصول را وارد کنید" })
    .transform(normalizeText)
    .refine((v) => v.length >= 2 && v.length <= 150, { message: "نام محصول باید بین ۲ تا ۱۵۰ کاراکتر باشد" }),
  description: optionalText(1000, "توضیحات"),
  unit: z.enum(productUnitValues, { error: "واحد فروش معتبر نیست" }),
  amount: z.coerce
    .number({ error: "مقدار را وارد کنید" })
    .positive("مقدار باید بزرگ‌تر از صفر باشد"),
  price: z.coerce
    .number({ error: "قیمت را وارد کنید" })
    .int("قیمت باید عدد صحیح باشد")
    .min(0, "قیمت نمی‌تواند منفی باشد"),
  discountPercent: z.coerce
    .number()
    .int("درصد تخفیف باید عدد صحیح باشد")
    .min(0, "درصد تخفیف نمی‌تواند منفی باشد")
    .max(100, "درصد تخفیف نمی‌تواند بیشتر از ۱۰۰ باشد")
    .default(0),
  stock: z.coerce.number().int("موجودی باید عدد صحیح باشد").min(0, "موجودی نمی‌تواند منفی باشد").default(0),
  imageUrl: optionalImageUrl,
  isActive: z.boolean().default(true),
});

export const productUpdateSchema = productSchema.partial();

// ───────────── سفارش ─────────────

export const orderSchema = z.object({
  addressId: uuidSchema,
  shippingMethod: z.enum(SHIPPING_METHOD_VALUES, { error: "روش ارسال را انتخاب کنید" }),
  note: optionalText(300, "توضیحات سفارش"),
  items: z
    .array(
      z.object({
        productId: uuidSchema,
        quantity: z.coerce
          .number({ error: "تعداد نامعتبر است" })
          .int("تعداد نامعتبر است")
          .min(1, "تعداد نامعتبر است")
          .max(MAX_QTY_PER_ITEM, `حداکثر ${MAX_QTY_PER_ITEM} عدد از هر کالا`),
      }),
      { error: "سبد خرید خالی است" },
    )
    .min(1, "سبد خرید خالی است")
    .max(MAX_CART_LINES, "تعداد کالاهای سبد بیش از حد مجاز است"),
});

// ───────────── مدیریت کاربران (پنل ادمین) ─────────────

/** نام اختیاری: خالی → null، ولی اگه پر شد باید معتبر باشه */
const optionalName = (label) =>
  z
    .string()
    .nullish()
    .transform((v) => normalizeText(v) || null)
    .refine((v) => v === null || NAME_REGEX.test(v), {
      message: `${label} معتبر نیست (فقط حروف، ۲ تا ۵۰ کاراکتر)`,
    });

const adminUserShape = {
  phone: mobileSchema(),
  firstName: optionalName("نام"),
  lastName: optionalName("نام خانوادگی"),
  email: z
    .string()
    .nullish()
    .transform((v) => (v ? v.trim().toLowerCase() : null))
    .refine((v) => v === null || (v.length <= 120 && EMAIL_REGEX.test(v)), {
      message: "ایمیل معتبر نیست",
    }),
  nationalCode: z
    .string()
    .nullish()
    .transform((v) => (v ? toEnglishDigits(v).trim() : null))
    .refine((v) => v === null || isValidNationalCode(v), { message: "کد ملی معتبر نیست" }),
  role: z.enum(["USER", "ADMIN"], { error: "نقش کاربر نامعتبر است" }),
  isActive: z.boolean({ error: "وضعیت حساب نامعتبر است" }),
};

export const adminUserCreateSchema = z.object({
  ...adminUserShape,
  role: adminUserShape.role.default("USER"),
  isActive: adminUserShape.isActive.default(true),
});

/** ویرایش جزئی؛ در route با pickProvided فقط فیلدهای فرستاده‌شده اعمال می‌شن */
export const adminUserUpdateSchema = z.object(adminUserShape).partial();

// ───────────── مدیریت سفارش‌ها (پنل ادمین) ─────────────

/** دلیل لغو: متن آماده‌شده‌ی سمت کلاینت (انتخاب + توضیح)، ۳ تا ۳۰۰ کاراکتر */
const cancelReasonField = z
  .string({ error: "دلیل لغو را وارد کنید" })
  .transform(normalizeText)
  .refine((v) => v.length >= CANCEL_REASON_MIN, { message: "دلیل لغو را وارد کنید" })
  .refine((v) => v.length <= CANCEL_REASON_MAX, { message: `دلیل لغو حداکثر ${CANCEL_REASON_MAX} کاراکتر باشد` });

export const adminOrderStatusSchema = z
  .object({
    status: z.enum(["PENDING", "PROCESSING", "SHIPPING", "DELIVERED", "CANCELED"], {
      error: "وضعیت سفارش نامعتبر است",
    }),
    cancelReason: z.string().nullish(),
  })
  .superRefine((v, ctx) => {
    if (v.status === "CANCELED" && !normalizeText(v.cancelReason)) {
      ctx.addIssue({ code: "custom", path: ["cancelReason"], message: "برای لغو سفارش، دلیل لغو را وارد کنید" });
    }
  })
  .transform((v) => ({
    status: v.status,
    cancelReason: v.status === "CANCELED" ? cancelReasonField.parse(v.cancelReason) : null,
  }));

/** لغو سفارش توسط مشتری */
export const orderCancelSchema = z.object({ reason: cancelReasonField });

/** پرداخت سفارش: آیا از کیف پول هم استفاده بشه (بقیه از درگاه) */
export const payOrderSchema = z.object({ useWallet: z.boolean({ error: "روش پرداخت نامعتبر است" }) });

/** هزینه‌ی ارسال برای نمایش توی سبد */
export const shippingQuoteSchema = z.object({
  province: z.string({ error: "استان را مشخص کنید" }).transform(normalizeText).refine((v) => v.length > 0 && v.length <= 60),
  city: z.string({ error: "شهر را مشخص کنید" }).transform(normalizeText).refine((v) => v.length > 0 && v.length <= 60),
  items: z
    .array(z.object({ productId: uuidSchema, quantity: z.coerce.number().int().min(1).max(MAX_QTY_PER_ITEM) }))
    .min(1)
    .max(MAX_CART_LINES),
});

/** شارژ/کسر دستی کیف پول توسط مدیر (توضیح اجباریه تا توی لاگ مشخص باشه چرا) */
export const adminWalletAdjustSchema = z.object({
  type: z.enum(["CREDIT", "DEBIT"], { error: "نوع تغییر نامعتبر است" }),
  amount: z.preprocess(
    (v) => (typeof v === "string" ? Number(toEnglishDigits(v).replace(/[,٬\s]/g, "")) : v),
    z.number({ error: "مبلغ را وارد کنید" }).int("مبلغ باید عدد صحیح باشد").min(1, "مبلغ باید بزرگ‌تر از صفر باشد").max(1_000_000_000, "مبلغ بیش از حد مجاز است"),
  ),
  note: z
    .string({ error: "توضیح را وارد کنید" })
    .transform(normalizeText)
    .refine((v) => v.length >= 3, { message: "دلیل تغییر موجودی را بنویسید" })
    .refine((v) => v.length <= 300, { message: "توضیح حداکثر ۳۰۰ کاراکتر باشد" }),
});

// ───────────── پیک‌ها ─────────────

export const courierSchema = z.object({
  name: nameField("نام پیک"),
  phone: mobileSchema("شماره موبایل پیک معتبر نیست"),
  vehicle: optionalText(40, "وسیله‌ی نقلیه"),
  isActive: z.boolean().default(true),
});

/** کد رهگیری پست: فقط حرف/عدد/خط‌تیره؛ خالی = برداشتن کد */
export const trackingCodeSchema = z.object({
  trackingCode: z
    .string()
    .nullish()
    .transform((v) => (v ? toEnglishDigits(String(v)).replace(/\s+/g, "") : ""))
    .refine((v) => v === "" || /^[A-Za-z0-9-]{5,40}$/.test(v), "کد رهگیری نامعتبر است (فقط حرف و عدد انگلیسی، ۵ تا ۴۰ کاراکتر)")
    .transform((v) => v || null),
});

export const courierAssignSchema = z.object({
  courierId: uuidSchema.nullish().transform((v) => v || null),
});

// ───────────── محدوده‌های ارسال ─────────────

/** عدد اختیاری: رشته‌ی خالی/null → null */
const optionalInt = (label, min = 0) =>
  z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? null : v),
    z.coerce.number({ error: `${label} معتبر نیست` }).int(`${label} باید عدد صحیح باشد`).min(min, `${label} معتبر نیست`).max(1_000_000_000, `${label} معتبر نیست`).nullable(),
  );

export const shippingZoneSchema = z
  .object({
    name: z
      .string({ error: "نام محدوده را وارد کنید" })
      .transform(normalizeText)
      .refine((v) => v.length >= 2 && v.length <= 60, { message: "نام محدوده باید بین ۲ تا ۶۰ کاراکتر باشد" }),
    province: z.string().nullish().transform((v) => normalizeText(v) || null),
    cities: z.array(z.string()).max(300, "تعداد شهرها بیش از حد مجاز است").default([]),
    fee: z.preprocess((v) => (v === "" || v == null ? 0 : v), z.coerce.number({ error: "هزینه‌ی ارسال معتبر نیست" }).int().min(0, "هزینه‌ی ارسال معتبر نیست").max(1_000_000_000)),
    freeOver: optionalInt("سقف ارسال رایگان", 1),
    deliveryTime: optionalText(60, "زمان تحویل"),
    isActive: z.boolean().default(true),
    sortOrder: z.preprocess((v) => (v === "" || v == null ? 0 : v), z.coerce.number().int()),
  })
  .superRefine((v, ctx) => {
    if (v.province && !getProvince(v.province)) {
      ctx.addIssue({ code: "custom", path: ["province"], message: "استان انتخاب‌شده معتبر نیست" });
    }
    if (!v.province && v.cities.length) {
      ctx.addIssue({ code: "custom", path: ["cities"], message: "برای انتخاب شهر ابتدا استان را انتخاب کنید" });
    }
  })
  .transform((v) => {
    const province = v.province ? getProvince(v.province) : null;
    const cities = province
      ? [...new Set(v.cities.map((c) => getCity(normalizeText(c), province.en)?.fa).filter(Boolean))]
      : [];
    return { ...v, province: province ? province.fa : null, cities };
  });

export const shippingSettingsSchema = z.object({
  postEnabled: z.boolean(),
  courierEnabled: z.boolean(),
  pickupEnabled: z.boolean(),
  defaultFee: z.preprocess((v) => (v === "" || v == null ? 0 : v), z.coerce.number({ error: "هزینه‌ی پیش‌فرض معتبر نیست" }).int().min(0, "هزینه‌ی پیش‌فرض معتبر نیست").max(1_000_000_000)),
  freeShippingOver: z.preprocess((v) => (v === "" || v == null ? 0 : v), z.coerce.number({ error: "سقف ارسال رایگان معتبر نیست" }).int().min(0, "سقف ارسال رایگان معتبر نیست").max(1_000_000_000)),
  tehranDeliveryTime: optionalText(60, "زمان تحویل تهران").transform((v) => v ?? ""),
  otherDeliveryTime: optionalText(60, "زمان تحویل سایر مناطق").transform((v) => v ?? ""),
  pickupAddress: optionalText(300, "آدرس فروشگاه").transform((v) => v ?? ""),
  note: optionalText(300, "توضیحات").transform((v) => v ?? ""),
});

export const storeStatusSchema = z.object({
  open: z.boolean({ error: "وضعیت فروشگاه نامعتبر است" }),
  closedMessage: optionalText(200, "پیام تعطیلی").transform((v) => v ?? ""),
});

export const sitePaletteSchema = z.object({
  palette: z.enum(PALETTE_IDS, { error: "پالت رنگی نامعتبر است" }),
});

// ───────────── تراکنش‌های مالی ─────────────

const amountField = z.preprocess(
  (v) => (typeof v === "string" ? Number(toEnglishDigits(v).replace(/[,٬\s]/g, "")) : v),
  z.number({ error: "مبلغ را وارد کنید" }).int("مبلغ باید عدد صحیح باشد").min(1, "مبلغ باید بزرگ‌تر از صفر باشد").max(1_000_000_000, "مبلغ بیش از حد مجاز است"),
);

export const transactionCreateSchema = z.object({
  type: z.enum(TRANSACTION_TYPE_VALUES, { error: "نوع تراکنش نامعتبر است" }),
  orderCode: z
    .string({ error: "کد سفارش را وارد کنید" })
    .transform((v) => toEnglishDigits(v).replace(/\s/g, ""))
    .refine((v) => /^\d{8}$/.test(v), { message: "کد سفارش ۸ رقمی است" }),
  amount: amountField,
  method: z.enum(PAYMENT_METHOD_VALUES, { error: "روش پرداخت نامعتبر است" }).default("ONLINE"),
  status: z.enum(TRANSACTION_STATUS_VALUES, { error: "وضعیت نامعتبر است" }).optional(),
  reference: optionalText(60, "شماره پیگیری"),
  note: optionalText(300, "توضیحات"),
});

export const transactionUpdateSchema = z.object({
  status: z.enum(TRANSACTION_STATUS_VALUES, { error: "وضعیت نامعتبر است" }).optional(),
  reference: optionalText(60, "شماره پیگیری"),
  note: optionalText(300, "توضیحات"),
});

// ───────────── بنرهای صفحه‌ی اصلی ─────────────

/** عکس بنر فقط از آپلود خودِ پنل (/api/admin/banners/upload) قابل قبوله، نه هر آدرس دلخواه */
// آدرس عکس بنر: خروجی route آپلود بنر (/api/images/<id>) یا فایل‌های قدیمیِ /uploads/banners/…
const BANNER_IMAGE_RE =
  /^(\/api\/images\/[0-9a-f-]{36}|\/uploads\/banners\/[0-9a-f-]{36}\.(jpg|png|webp))$/i;

/** مقصد کلیک: مسیر داخلی سایت («/products?discounted=1») یا آدرس کامل https؛ چیزی مثل javascript: رد می‌شه */
function isValidBannerLink(v) {
  if (!v) return true;
  if (/\s/.test(v)) return false;
  if (v.startsWith("/")) return !v.startsWith("//") && !v.includes("\\");
  try {
    return new URL(v).protocol === "https:";
  } catch {
    return false;
  }
}

export const bannerSchema = z.object({
  title: z
    .string({ error: "عنوان بنر را وارد کنید" })
    .transform(normalizeText)
    .refine((v) => v.length >= 2 && v.length <= 80, { message: "عنوان باید بین ۲ تا ۸۰ کاراکتر باشد" }),
  imageUrl: z
    .string({ error: "عکس بنر را انتخاب کنید" })
    .refine((v) => BANNER_IMAGE_RE.test(v), { message: "عکس بنر را انتخاب کنید" }),
  linkUrl: z
    .string()
    .nullish()
    .transform((v) => (v ?? "").trim())
    .refine(isValidBannerLink, { message: "لینک باید با / شروع شود (مثلاً /products) یا یک آدرس کامل https باشد" })
    .transform((v) => v || null),
  isActive: z.boolean().default(true),
});

export const bannerOrderSchema = z.object({
  ids: z.array(uuidSchema).min(1).max(50),
});
