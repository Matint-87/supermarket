import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BottomNav from "@/components/BottomNav";
import ProfilePageClient from "@/components/profile/ProfilePageClient";
import { requireUser, toPublicUser } from "@/lib/dal";

export const metadata = { title: "حساب کاربری | سوپرمارکت رحیمی" };

const SECTIONS = ["orders", "wallet", "addresses", "info", "appearance"];

export default async function ProfilePage({ searchParams }) {
  const { tab } = await searchParams;
  const section = SECTIONS.includes(tab) ? tab : "orders";
  const user = await requireUser({ next: "/profile" });

  return (
    <div className="flex min-h-dvh flex-col bg-slate-50 [&>*]:w-full font-[Number]">
      <Header />
      <main className="mx-auto w-full max-w-7xl px-3 pb-6 pt-4 sm:px-4 md:pt-6">
        <h1 className="mb-3 text-xl font-extrabold text-slate-800 md:hidden">
          {user.firstName ? `سلام ${user.firstName} 👋` : "حساب کاربری"}
        </h1>
        <ProfilePageClient user={toPublicUser(user)} initialSection={section} />
      </main>
      <Footer />
      <BottomNav active="profile" />
    </div>
  );
}
