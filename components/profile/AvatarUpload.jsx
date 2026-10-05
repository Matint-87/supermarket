"use client";

import { useRef, useState } from "react";
import { FaCamera, FaTimes, FaUser, FaUserShield } from "react-icons/fa";
import { ApiClientError } from "@/lib/api-client";
import { Spinner } from "@/components/ui/form";
import { notify, useToastOnChange } from "@/lib/toast";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 3 * 1024 * 1024;

/** آپلود مستقیم multipart/form-data — نمی‌شه از api() توی lib/api-client.js استفاده کرد چون اون فقط JSON می‌فرسته */
async function uploadAvatar(file) {
  const body = new FormData();
  body.append("avatar", file);
  let res;
  try {
    res = await fetch("/api/profile/avatar", { method: "POST", body, cache: "no-store" });
  } catch {
    throw new ApiClientError("ارتباط با سرور برقرار نشد. اینترنت خود را بررسی کنید.");
  }
  let data = null;
  try {
    data = await res.json();
  } catch {}
  if (!res.ok || !data?.ok) {
    throw new ApiClientError(data?.error || "آپلود عکس با خطا مواجه شد.", { status: res.status });
  }
  return data;
}

async function removeAvatar() {
  const res = await fetch("/api/profile/avatar", { method: "DELETE", cache: "no-store" });
  let data = null;
  try {
    data = await res.json();
  } catch {}
  if (!res.ok || !data?.ok) throw new ApiClientError(data?.error || "حذف عکس با خطا مواجه شد.");
  return data;
}

/** آواتار دایره‌ای + دکمه‌ی تغییر/حذف عکس پروفایل. خطا و موفقیت به‌صورت toast نشون داده می‌شه. */
export default function AvatarUpload({ user, onSaved, size = 56 }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useToastOnChange(error);

  function pick() {
    setError("");
    inputRef.current?.click();
  }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // تا انتخاب دوباره‌ی همون فایل هم onChange رو بزنه
    if (!file) return;
    setError("");
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("فقط عکس JPG، PNG یا WebP قابل قبول است");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("حجم عکس نباید بیشتر از ۳ مگابایت باشد");
      return;
    }
    setBusy(true);
    try {
      const data = await uploadAvatar(file);
      notify.success("عکس پروفایل به‌روز شد.");
      onSaved?.(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(e) {
    e.stopPropagation();
    setBusy(true);
    setError("");
    try {
      const data = await removeAvatar();
      notify.success("عکس پروفایل حذف شد.");
      onSaved?.(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex flex-col items-start gap-1.5">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <button
          type="button"
          onClick={pick}
          disabled={busy}
          className="group relative flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-green-50 text-green-700 ring-1 ring-slate-200 transition hover:ring-green-300 disabled:cursor-not-allowed"
        >
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatarUrl} alt="عکس پروفایل" className="h-full w-full object-cover" />
          ) : user.role === "ADMIN" ? (
            <FaUserShield size={size * 0.43} />
          ) : (
            <FaUser size={size * 0.43} />
          )}

          <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
            {busy ? <Spinner className="text-white" /> : <FaCamera className="text-white" size={size * 0.3} />}
          </span>
        </button>

        {user.avatarUrl && !busy && (
          <button
            type="button"
            onClick={handleRemove}
            aria-label="حذف عکس پروفایل"
            className="absolute -bottom-1 -left-1 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-red-50 hover:text-red-600"
          >
            <FaTimes size={11} />
          </button>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFile}
        />
      </div>
    </div>
  );
}
