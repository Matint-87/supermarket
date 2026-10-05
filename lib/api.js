import "server-only";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { ZodError } from "zod";

/** خطای قابل نمایش به کاربر (پیام فارسی) */
export class ApiError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

export function ok(data = {}, init) {
  return NextResponse.json({ ok: true, ...data }, init);
}

export function fail(status, message, extra = {}) {
  return NextResponse.json({ ok: false, error: message, ...extra }, { status });
}

/** بدنه JSON رو می‌خونه — فقط application/json (یکی از لایه‌های دفاع در برابر CSRF) */
export async function readJson(request) {
  const type = request.headers.get("content-type") || "";
  if (!type.includes("application/json")) {
    throw new ApiError(415, "درخواست نامعتبر است");
  }
  try {
    const body = await request.json();
    if (body === null || typeof body !== "object") throw new Error("bad");
    return body;
  } catch {
    throw new ApiError(400, "درخواست نامعتبر است");
  }
}

/** IP کلاینت — پشت nginx حتماً X-Forwarded-For / X-Real-IP رو ست کن */
export async function getClientIp() {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return h.get("x-real-ip") || "unknown";
}

/** خطاهای Zod رو به {field: message} تبدیل می‌کنه */
export function zodFieldErrors(error) {
  const out = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    out[key] ??= issue.message;
  }
  return out;
}

/** wrapper مشترک برای همه‌ی route handlerها: خطاها رو به JSON تمیز تبدیل می‌کنه */
export function handler(fn) {
  return async (request, ctx) => {
    try {
      return await fn(request, ctx);
    } catch (err) {
      if (err instanceof ApiError) return fail(err.status, err.message, err.extra);
      if (err instanceof ZodError) {
        const fields = zodFieldErrors(err);
        const first = Object.values(fields)[0] || "اطلاعات وارد شده معتبر نیست";
        return fail(400, first, { fields });
      }
      console.error("[api error]", err);
      return fail(500, "خطایی رخ داد. لطفاً دوباره تلاش کنید.");
    }
  };
}

/**
 * برای PATCH: فقط کلیدهایی که واقعاً توی بدنه‌ی درخواست بودن رو از نتیجه‌ی zod نگه می‌داره.
 * (schema.partial() برای فیلدهای default/nullish مقدار پیش‌فرض یا null می‌سازه و بدون این فیلتر،
 * یه PATCH که فقط {isActive} می‌فرسته موجودی و تخفیف رو صفر می‌کرد.)
 */
export function pickProvided(raw, parsed) {
  const source = raw && typeof raw === "object" ? raw : {};
  return Object.fromEntries(
    Object.entries(parsed).filter(([key, value]) => Object.hasOwn(source, key) && value !== undefined),
  );
}
