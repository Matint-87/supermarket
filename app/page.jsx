import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Hero from "@/components/Hero";
import BannerSlider from "@/components/BannerSlider";
import HomeContent from "@/components/HomeContent";
import BottomNav from "@/components/BottomNav";
import { getActiveBanners } from "@/lib/banners";

// بنرها از پنل مدیریت عوض می‌شن؛ پس صفحه نباید موقع build ثابت بشه
export const dynamic = "force-dynamic";

export default async function Home() {
  const banners = await getActiveBanners();

  return (
    <div className="flex min-h-dvh flex-col bg-slate-50 [&>*]:w-full font-[Number] text-slate-800">
      <Header />
      {/* اگه ادمین بنر فعالی گذاشته باشه اسلایدر بنرها، وگرنه هیروی پیش‌فرض */}
      {banners.length > 0 ? <BannerSlider banners={banners} /> : <Hero />}
      <HomeContent />
      <Footer />
      <BottomNav />
    </div>
  );
}
