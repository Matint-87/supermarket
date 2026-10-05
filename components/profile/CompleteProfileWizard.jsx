"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { FaCheck, FaMapMarkerAlt, FaUser } from "react-icons/fa";
import { api } from "@/lib/api-client";
import { useAuth } from "@/components/auth/AuthProvider";
import { btnSecondary } from "@/components/ui/form";
import AddressForm from "@/components/address/AddressForm";
import BackButton from "@/components/BackButton";
import ProfileForm from "./ProfileForm";

const STEPS = [
  { key: 1, label: "اطلاعات شخصی", icon: FaUser },
  { key: 2, label: "آدرس گیرنده", icon: FaMapMarkerAlt },
];

export default function CompleteProfileWizard({ user: initialUser, next }) {
  const router = useRouter();
  const { setUser } = useAuth();
  const [user, setLocalUser] = useState(initialUser);
  const [step, setStep] = useState(initialUser.profileCompleted ? 2 : 1);
  const [hasAddress, setHasAddress] = useState(null); // null = در حال بررسی
  const [checkingAddress, setCheckingAddress] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api("GET", "/api/addresses")
      .then((data) => {
        if (cancelled) return;
        const has = data.addresses.length > 0;
        setHasAddress(has);
        // اگه هر دو قسمت از قبل کامل بودن، مستقیم برو ادامه (مثلاً کاربر دوباره این لینک رو باز کرده)
        if (initialUser.profileCompleted && has) router.replace(next);
      })
      .finally(() => !cancelled && setCheckingAddress(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleProfileSaved(updatedUser) {
    setUser(updatedUser);
    setLocalUser(updatedUser);
    setStep(2);
  }

  function goToApp() {
    router.replace(next);
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      {/* مرحله‌ی ۲ → برگشت به مرحله‌ی ۱؛ مرحله‌ی ۱ → صفحه‌ی قبلی */}
      <div className="mb-5">
        {step === 2 ? (
          <BackButton variant="inline" hideOn={[]} label="مرحله‌ی قبل" onClick={() => setStep(1)} />
        ) : (
          <BackButton variant="inline" hideOn={[]} fallback="/" />
        )}
      </div>
      <ol className="mb-6 flex items-center gap-3">
        {STEPS.map(({ key, label, icon: Icon }, i) => {
          const state = key < step ? "done" : key === step ? "current" : "todo";
          return (
            <li key={key} className="flex flex-1 items-center gap-2">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  state === "done"
                    ? "bg-green-700 text-white"
                    : state === "current"
                      ? "border-2 border-green-700 text-green-700"
                      : "border-2 border-slate-200 text-slate-400"
                }`}
              >
                {state === "done" ? <FaCheck size={12} /> : <Icon size={13} />}
              </span>
              <span className={`text-xs font-medium ${state === "todo" ? "text-slate-400" : "text-slate-700"}`}>
                {label}
              </span>
              {i < STEPS.length - 1 && <span className="mx-1 h-px flex-1 bg-slate-200" />}
            </li>
          );
        })}
      </ol>

      {step === 1 && (
        <ProfileForm user={user} submitLabel="ذخیره و ادامه" onSaved={handleProfileSaved} />
      )}

      {step === 2 && (
        <div className="space-y-4">
          <p className="text-xs leading-6 text-slate-500">
            آدرس محل تحویل سفارش را ثبت کنید. می‌توانید بعداً از پروفایل خود آدرس‌های بیشتری اضافه کنید.
          </p>
          {checkingAddress ? (
            <div className="py-8 text-center text-xs text-slate-400">در حال بررسی...</div>
          ) : (
            <AddressForm onSaved={goToApp} />
          )}
          {hasAddress && (
            <button type="button" onClick={goToApp} className={cn(btnSecondary, "w-full")}>
              فعلاً رد شو (قبلاً آدرس ثبت کرده‌اید)
            </button>
          )}
        </div>
      )}
    </div>
  );
}
