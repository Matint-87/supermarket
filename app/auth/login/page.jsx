import AuthShell from "@/components/auth/AuthShell";
import LoginFlow from "@/components/auth/LoginFlow";
import { safeNext } from "@/lib/validators";

export const metadata = { title: "ورود / ثبت‌نام", robots: { index: false, follow: false } };

export default async function LoginPage({ searchParams }) {
  const sp = await searchParams;
  const next = safeNext(sp?.next);
  return (
    <AuthShell>
      <LoginFlow next={next} />
    </AuthShell>
  );
}
