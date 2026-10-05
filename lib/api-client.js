// کمک‌تابع فراخوانی API از سمت مرورگر. خطاها به ApiClientError با پیام فارسی تبدیل می‌شن.

export class ApiClientError extends Error {
  constructor(message, { status = 0, fields, data } = {}) {
    super(message);
    this.status = status;
    this.fields = fields ?? {};
    this.data = data ?? {};
  }
}

export async function api(method, url, body) {
  let res;
  try {
    res = await fetch(url, {
      method,
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
  } catch {
    throw new ApiClientError("ارتباط با سرور برقرار نشد. اینترنت خود را بررسی کنید.");
  }
  let data = null;
  try {
    data = await res.json();
  } catch {}
  if (!res.ok || !data?.ok) {
    throw new ApiClientError(data?.error || "خطایی رخ داد. لطفاً دوباره تلاش کنید.", {
      status: res.status,
      fields: data?.fields,
      data: data ?? {},
    });
  }
  return data;
}
