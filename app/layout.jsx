import "./globals.css";
import AppProviders from "@/components/providers/AppProviders";
import { PALETTE_BY_ID, DEFAULT_PALETTE } from "@/lib/palettes";
import { getSitePalette } from "@/lib/settings";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import { STORE_INFO } from "@/lib/store-info";
import { JsonLd, DEFAULT_OG_IMAGE } from "@/lib/seo";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL, absUrl } from "@/lib/site";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  // صفحه‌ها فقط بخش اختصاصی عنوان رو می‌دن؛ «| نام فروشگاه» خودکار اضافه می‌شه
  title: { default: `${SITE_NAME} | خرید آنلاین مایحتاج روزانه`, template: `%s | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "fa_IR",
    siteName: SITE_NAME,
    title: `${SITE_NAME} | خرید آنلاین مایحتاج روزانه`,
    description: SITE_DESCRIPTION,
    url: "/",
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: { card: "summary_large_image", title: SITE_NAME, description: SITE_DESCRIPTION, images: [DEFAULT_OG_IMAGE] },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
  formatDetection: { telephone: false },
};

// داده‌ی ساختاریِ سراسری: معرفی فروشگاه + کادر جستجوی سایت در گوگل
function siteJsonLd() {
  const store = {
    "@type": "GroceryStore",
    "@id": absUrl("/#store"),
    name: SITE_NAME,
    url: absUrl("/"),
    logo: absUrl("/icon.png"),
    image: absUrl(DEFAULT_OG_IMAGE),
    description: SITE_DESCRIPTION,
    priceRange: "$$",
    currenciesAccepted: "IRR",
    ...(STORE_INFO.phone && { telephone: STORE_INFO.phone }),
    ...(STORE_INFO.email && { email: STORE_INFO.email }),
    ...(STORE_INFO.workingHours && { openingHours: STORE_INFO.workingHours }),
    ...(STORE_INFO.address && {
      address: { "@type": "PostalAddress", streetAddress: STORE_INFO.address, addressCountry: "IR" },
    }),
  };
  const website = {
    "@type": "WebSite",
    "@id": absUrl("/#website"),
    url: absUrl("/"),
    name: SITE_NAME,
    inLanguage: "fa-IR",
    publisher: { "@id": absUrl("/#store") },
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${absUrl("/products")}?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
  return { "@context": "https://schema.org", "@graph": [store, website] };
}

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
        <JsonLd data={siteJsonLd()} />
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
