import { SITE_URL } from "@/lib/site";

export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        // /api/images/ باید باز بمونه تا گوگل عکس محصولات رو ببینه؛ قانون دقیق‌تر روی Disallow: /api/ غلبه می‌کنه
        allow: ["/", "/api/images/"],
        disallow: ["/admin", "/api/", "/auth", "/cart", "/profile", "/complete-profile", "/pay"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
