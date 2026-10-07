import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Hero from "@/components/Hero";
import BannerSlider from "@/components/BannerSlider";
import HomeContent from "@/components/HomeContent";
import BottomNav from "@/components/BottomNav";
import { getActiveBanners } from "@/lib/banners";
import { getActiveCategories, getProductsForShelf } from "@/lib/catalog";
import { SITE_NAME } from "@/lib/site";

// بنرها از پنل مدیریت عوض می‌شن؛ پس صفحه نباید موقع build ثابت بشه
export const dynamic = "force-dynamic";

export default async function Home() {
  // دسته‌ها و محصولات از سرور رندر می‌شن تا لینک‌هاشون توی HTML اولیه (قابل خزش برای گوگل) باشه
  const [banners, categories, newest, discounted] = await Promise.all([
    getActiveBanners(),
    getActiveCategories().catch(() => null),
    getProductsForShelf({ limit: 12 }),
    getProductsForShelf({ limit: 12, discounted: true }),
  ]);

  return (
    <div className="flex min-h-dvh flex-col bg-slate-50 [&>*]:w-full font-[Number] text-slate-800">
      <Header />
      {/* اگه ادمین بنر فعالی گذاشته باشه اسلایدر بنرها، وگرنه هیروی پیش‌فرض */}
      {/* وقتی بنر نمایش داده می‌شه (و Hero با h1 اش نیست)، صفحه همچنان یک h1 داره */}
      {banners.length > 0 ? (
        <>
          <h1 className="sr-only">{SITE_NAME} | خرید آنلاین مایحتاج روزانه</h1>
          <BannerSlider banners={banners} />
        </>
      ) : (
        <Hero />
      )}
      <HomeContent categories={categories} newest={newest} discounted={discounted} />
      <Footer />
      <BottomNav />
    </div>
  );
}
