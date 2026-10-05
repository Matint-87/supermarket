"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import BackButton from "@/components/BackButton";
import { api } from "@/lib/api-client";
import { OTP_LENGTH } from "@/lib/auth-constants";
import { normalizeMobile, toEnglishDigits, toFaDigits } from "@/lib/phone";
import { checkPassword } from "@/lib/validators";
import { Alert, Field, Spinner, btnPrimary, btnSecondary, inputCls } from "@/components/ui/form";
import { notify, useToastOnChange } from "@/lib/toast";
import { useAuth } from "./AuthProvider";
import OtpInput from "./OtpInput";

// phone → (password) یا (otp → setPassword)
export default function LoginFlow({ next = "/" }) {
  const router = useRouter();
  const { user, loading: authLoading, setUser } = useAuth();
  const finishing = useRef(false);

  const [step, setStep] = useState("phone");
  const [phone, setPhone] = useState("");
  const [purpose, setPurpose] = useState("LOGIN"); // هدف OTP: ورود/ثبت‌نام یا فراموشی رمز
  const [isNew, setIsNew] = useState(false);
  const [resendAt, setResendAt] = useState(0);
  const [devCode, setDevCode] = useState(null);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  useToastOnChange(error); // خطای کلی به‌صورت toast نشون داده می‌شه (خطای زیر هر فیلد همون‌جا می‌مونه)
  const [fieldError, setFieldError] = useState("");
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const afterLoginPath = (u) =>
    u.profileCompleted ? next : `/complete-profile?next=${encodeURIComponent(next)}`;

  // کاربری که از قبل وارد شده نباید صفحه‌ی ورود رو ببینه
  useEffect(() => {
    if (!authLoading && user && !finishing.current) router.replace(afterLoginPath(user));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  // شمارنده‌ی «ارسال مجدد کد»
  useEffect(() => {
    if (step !== "otp") return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [step]);

  const secondsLeft = Math.max(0, Math.ceil((resendAt - now) / 1000));

  function resetMessages() {
    setError("");
    setFieldError("");
  }

  function goBackToPhone() {
    resetMessages();
    setCode("");
    setPassword("");
    setConfirm("");
    setStep("phone");
  }

  function beginOtp(data) {
    resetMessages();
    setPurpose(data.purpose ?? "LOGIN");
    setIsNew(Boolean(data.isNew));
    setResendAt(Date.now() + (data.resendIn ?? 60) * 1000);
    setNow(Date.now());
    setDevCode(data.devCode ?? null);
    setCode("");
    setStep("otp");
  }

  function finish(loggedInUser) {
    finishing.current = true;
    notify.success("با موفقیت وارد شدید.");
    setUser(loggedInUser);
    router.replace(afterLoginPath(loggedInUser));
  }

  async function run(fn) {
    setBusy(true);
    resetMessages();
    try {
      await fn();
    } catch (err) {
      setError(err.message);
      return err;
    } finally {
      setBusy(false);
    }
  }

  // ───── قدم ۱: شماره ─────
  function submitPhone(e) {
    e.preventDefault();
    const normalized = normalizeMobile(phone);
    if (!normalized) {
      setFieldError("شماره موبایل معتبر نیست (مثال: ۰۹۱۲۳۴۵۶۷۸۹)");
      return;
    }
    run(async () => {
      const data = await api("POST", "/api/auth/start", { phone: normalized });
      setPhone(normalized);
      if (data.step === "password") {
        setPassword("");
        setStep("password");
      } else {
        beginOtp(data);
      }
    });
  }

  // ───── ورود با رمز ─────
  function submitPassword(e) {
    e.preventDefault();
    if (!password) {
      setFieldError("رمز عبور را وارد کنید");
      return;
    }
    run(async () => {
      const data = await api("POST", "/api/auth/login", { phone, password });
      finish(data.user);
    });
  }

  function forgotPassword() {
    run(async () => {
      const data = await api("POST", "/api/auth/otp/send", { phone, purpose: "RESET_PASSWORD" });
      beginOtp(data);
    });
  }

  // ───── OTP ─────
  function verifyCode(value) {
    if (busy) return;
    if (value.length !== OTP_LENGTH) {
      setFieldError(`کد تأیید ${toFaDigits(OTP_LENGTH)} رقمی است`);
      return;
    }
    run(async () => {
      try {
        await api("POST", "/api/auth/otp/verify", { phone, purpose, code: value });
      } catch (err) {
        setCode("");
        throw err;
      }
      setPassword("");
      setConfirm("");
      setStep("setPassword");
    });
  }

  function resendCode() {
    run(async () => {
      try {
        const data = await api("POST", "/api/auth/otp/send", { phone, purpose });
        beginOtp({ ...data, isNew });
      } catch (err) {
        if (err.data?.retryAfter) setResendAt(Date.now() + err.data.retryAfter * 1000);
        throw err;
      }
    });
  }

  // ───── تعیین رمز ─────
  function submitNewPassword(e) {
    e.preventDefault();
    const problem = checkPassword(password, phone);
    if (problem) {
      setFieldError(problem);
      return;
    }
    if (password !== confirm) {
      setFieldError("تکرار رمز عبور با رمز وارد شده یکی نیست");
      return;
    }
    run(async () => {
      try {
        const data = await api("POST", "/api/auth/set-password", { password });
        finish(data.user);
      } catch (err) {
        if (err.data?.code === "TICKET_EXPIRED") {
          setStep("phone");
        }
        throw err;
      }
    });
  }

  const passwordToggle = (
    <button
      type="button"
      onClick={() => setShowPw((v) => !v)}
      aria-label={showPw ? "پنهان کردن رمز" : "نمایش رمز"}
      className="absolute inset-y-0 start-0 flex w-11 items-center justify-center text-slate-500 hover:text-slate-700"
    >
      {showPw ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
    </button>
  );

  // مرحله‌های بعد از شماره: برگشت به وارد کردن شماره
  const backButton = (label = "تغییر شماره") => (
    <div>
      <BackButton variant="inline" hideOn={[]} label={label} onClick={goBackToPhone} />
    </div>
  );

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      {/* ───────── شماره ───────── */}
      {step === "phone" && (
        <form onSubmit={submitPhone} noValidate className="space-y-5">
          {/* مرحله‌ی اول: برگشت به صفحه‌ی قبلی سایت */}
          <div>
            <BackButton variant="inline" hideOn={[]} fallback="/" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-slate-800">ورود / ثبت‌نام</h1>
            <p className="mt-1.5 text-xs leading-6 text-slate-500">
              برای ورود یا ساخت حساب کاربری، شماره موبایل خود را وارد کنید.
            </p>
          </div>
          <Field label="شماره موبایل" htmlFor="phone" error={fieldError}>
            <input
              id="phone"
              name="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              dir="ltr"
              autoFocus
              placeholder="09123456789"
              value={phone}
              onChange={(e) => {
                setFieldError("");
                setPhone(toEnglishDigits(e.target.value).replace(/[^\d+\s-]/g, ""));
              }}
              className={`${inputCls(Boolean(fieldError))} text-left tracking-wider`}
            />
          </Field>
          <button type="submit" disabled={busy} className={btnPrimary}>
            {busy && <Spinner />}
            ادامه
          </button>
        </form>
      )}

      {/* ───────── رمز عبور ───────── */}
      {step === "password" && (
        <form onSubmit={submitPassword} noValidate className="space-y-5">
          {backButton()}
          <div>
            <h1 className="text-lg font-extrabold text-slate-800">رمز عبور را وارد کنید</h1>
            <p className="mt-1.5 text-xs leading-6 text-slate-500">
              خوش آمدید! برای شماره <span dir="ltr">{toFaDigits(phone)}</span> رمز عبور خود را وارد کنید.
            </p>
          </div>
          <Field label="رمز عبور" htmlFor="password" error={fieldError}>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPw ? "text" : "password"}
                autoComplete="current-password"
                dir="ltr"
                autoFocus
                value={password}
                onChange={(e) => {
                  setFieldError("");
                  setPassword(e.target.value);
                }}
                className={`${inputCls(Boolean(fieldError))} ps-11 text-left`}
              />
              {passwordToggle}
            </div>
          </Field>
          <button type="submit" disabled={busy} className={btnPrimary}>
            {busy && <Spinner />}
            ورود
          </button>
          <button
            type="button"
            onClick={forgotPassword}
            disabled={busy}
            className="w-full text-center text-xs font-medium text-green-700 hover:text-green-800 disabled:opacity-60"
          >
            رمز عبور را فراموش کرده‌ام
          </button>
        </form>
      )}

      {/* ───────── کد تأیید ───────── */}
      {step === "otp" && (
        <div className="space-y-5">
          {backButton()}
          <div>
            <h1 className="text-lg font-extrabold text-slate-800">کد تأیید را وارد کنید</h1>
            <p className="mt-1.5 text-xs leading-6 text-slate-500">
              کد {toFaDigits(OTP_LENGTH)} رقمی به شماره <span dir="ltr">{toFaDigits(phone)}</span> پیامک شد.
              {purpose === "LOGIN" && isNew && " بعد از تأیید، حساب شما ساخته می‌شود."}
              {purpose === "RESET_PASSWORD" && " بعد از تأیید می‌توانید رمز جدید انتخاب کنید."}
            </p>
          </div>

          {devCode && (
            <Alert kind="warning">
              حالت توسعه — کد تأیید: <b dir="ltr">{devCode}</b>{" "}
              <button
                type="button"
                className="ms-1 underline"
                onClick={() => {
                  setCode(devCode);
                  verifyCode(devCode);
                }}
              >
                استفاده
              </button>
              <br />
              (این کادر در production نمایش داده نمی‌شود)
            </Alert>
          )}

          <div>
            <OtpInput
              value={code}
              onChange={(v) => {
                resetMessages();
                setCode(v);
              }}
              onComplete={verifyCode}
              disabled={busy}
              hasError={Boolean(error || fieldError)}
            />
            {fieldError && (
              <p role="alert" className="mt-2 text-center text-xs text-red-600">
                {fieldError}
              </p>
            )}
          </div>


          <button type="button" onClick={() => verifyCode(code)} disabled={busy} className={btnPrimary}>
            {busy && <Spinner />}
            تأیید
          </button>

          <div className="text-center text-xs text-slate-500">
            {secondsLeft > 0 ? (
              <span>
                ارسال مجدد کد تا <b className="text-slate-700">{toFaDigits(secondsLeft)}</b> ثانیه دیگر
              </span>
            ) : (
              <button
                type="button"
                onClick={resendCode}
                disabled={busy}
                className="font-medium text-green-700 hover:text-green-800 disabled:opacity-60"
              >
                ارسال مجدد کد
              </button>
            )}
          </div>
        </div>
      )}

      {/* ───────── تعیین رمز ───────── */}
      {step === "setPassword" && (
        <form onSubmit={submitNewPassword} noValidate className="space-y-5">
          <div>
            <h1 className="text-lg font-extrabold text-slate-800">
              {purpose === "RESET_PASSWORD" ? "رمز عبور جدید" : "رمز عبور خود را انتخاب کنید"}
            </h1>
            <p className="mt-1.5 text-xs leading-6 text-slate-500">
              {purpose === "RESET_PASSWORD"
                ? "با تغییر رمز، از سایر دستگاه‌ها خارج می‌شوید."
                : "شماره شما تأیید شد. دفعه‌های بعد با همین رمز وارد می‌شوید."}
            </p>
          </div>
          <Field
            label="رمز عبور"
            htmlFor="new-password"
            hint="حداقل ۸ کاراکتر، شامل حداقل یک حرف و یک عدد"
            error={fieldError}
          >
            <div className="relative">
              <input
                id="new-password"
                name="new-password"
                type={showPw ? "text" : "password"}
                autoComplete="new-password"
                dir="ltr"
                autoFocus
                value={password}
                onChange={(e) => {
                  setFieldError("");
                  setPassword(e.target.value);
                }}
                className={`${inputCls(Boolean(fieldError))} ps-11 text-left`}
              />
              {passwordToggle}
            </div>
          </Field>
          <Field label="تکرار رمز عبور" htmlFor="confirm-password">
            <input
              id="confirm-password"
              name="confirm-password"
              type={showPw ? "text" : "password"}
              autoComplete="new-password"
              dir="ltr"
              value={confirm}
              onChange={(e) => {
                setFieldError("");
                setConfirm(e.target.value);
              }}
              className={`${inputCls(false)} text-left`}
            />
          </Field>
          <button type="submit" disabled={busy} className={btnPrimary}>
            {busy && <Spinner />}
            {purpose === "RESET_PASSWORD" ? "ثبت رمز جدید و ورود" : "ثبت رمز و ادامه"}
          </button>
          <button type="button" onClick={goBackToPhone} className={cn(btnSecondary, "w-full")}>
            انصراف
          </button>
        </form>
      )}
    </div>
  );
}
