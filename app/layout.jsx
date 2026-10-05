import "./globals.css";
import AppProviders from "@/components/providers/AppProviders";
import { PALETTE_BY_ID, DEFAULT_PALETTE } from "@/lib/palettes";
import { getSitePalette } from "@/lib/settings";
import { THEME_INIT_SCRIPT } from "@/lib/theme";

export const metadata = {
  title: "سوپرمارکت رحیمی",
  description: "خرید آنلاین مایحتاج روزانه با بهترین قیمت و ارسال سریع",
};

// پالت رنگی انتخاب‌شده از پنل مدیریت؛ رنگ نوار مرورگر موبایل هم با همون پالت هماهنگ می‌شه
export async function generateViewport() {
  const tc = PALETTE_BY_ID[await getSitePalette()].themeColor;
  return {
    width: "device-width",
    initialScale: 1,
    // بدون این، env(safe-area-inset-bottom) روی آیفون همیشه صفره و منوی پایین روی نوار Home می‌افته
    viewportFit: "cover",
    // رنگ نوار مرورگر موبایل با پالت و تم دستگاه هماهنگ می‌شه
    themeColor: [
      { media: "(prefers-color-scheme: light)", color: tc.light },
      { media: "(prefers-color-scheme: dark)", color: tc.dark },
    ],
    colorScheme: "light dark",
  };
}

export default async function RootLayout({ children }) {
  const palette = await getSitePalette();
  return (
    // suppressHydrationWarning: اسکریپت تم قبل از هیدریت کلاس dark رو روی <html> می‌ذاره
    <html
      lang="fa"
      dir="rtl"
      className="font-[Number]"
      data-palette={palette === DEFAULT_PALETTE ? undefined : palette}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
