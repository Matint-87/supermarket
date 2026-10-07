import AuthShell from "@/components/auth/AuthShell";
import CompleteProfileWizard from "@/components/profile/CompleteProfileWizard";
import { requireUser, toPublicUser } from "@/lib/dal";
import { safeNext } from "@/lib/validators";

export const metadata = { title: "تکمیل اطلاعات", robots: { index: false, follow: false } };

export default async function CompleteProfilePage({ searchParams }) {
  const sp = await searchParams;
  const next = safeNext(sp?.next);
  const user = await requireUser({ next: `/complete-profile?next=${encodeURIComponent(next)}` });

  return (
    <AuthShell wide>
      <CompleteProfileWizard user={toPublicUser(user)} next={next} />
    </AuthShell>
  );
}
