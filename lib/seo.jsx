// کمک‌های مشترک سئو: ساخت metadata یکدست و JSON-LD امن
import { SITE_NAME, SITE_DESCRIPTION, absUrl } from "@/lib/site";

export const DEFAULT_OG_IMAGE = "/og-default.png";

/**
 * metadata کامل یک صفحه (title/description/canonical/OG/Twitter).
 * نکته: openGraph فرزند کل openGraph والد رو جایگزین می‌کنه، پس siteName/locale اینجا دوباره پر می‌شن.
 */
export function buildMetadata({ title, description = SITE_DESCRIPTION, path, image, noindex = false, ogType = "website" }) {
  const images = [{ url: absUrl(image || DEFAULT_OG_IMAGE) }];
  return {
    title,
    description,
    alternates: path ? { canonical: path } : undefined,
    openGraph: {
      type: ogType,
      locale: "fa_IR",
      siteName: SITE_NAME,
      title: title ? `${title} | ${SITE_NAME}` : SITE_NAME,
      description,
      url: path ? absUrl(path) : undefined,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: title ? `${title} | ${SITE_NAME}` : SITE_NAME,
      description,
      images: images.map((i) => i.url),
    },
    ...(noindex && { robots: { index: false, follow: false } }),
  };
}

/** صفحه‌های خصوصی/بی‌ارزش برای گوگل (سبد، پروفایل، ورود، ...) */
export const NOINDEX = { robots: { index: false, follow: false } };

/** کوتاه‌کردن متن برای meta description (حدود ۱۶۰ کاراکتر، بدون بریدن وسط کلمه) */
export function truncate(text, max = 160) {
  const clean = String(text ?? "").replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).replace(/\s+\S*$/, "")}…`;
}

/** JSON-LD؛ «<» رو escape می‌کنه تا محتوای دیتابیس نتونه تگ script رو ببنده */
export function JsonLd({ data }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

export function breadcrumbLd(items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: absUrl(it.path),
    })),
  };
}
