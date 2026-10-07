/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" }, // سایت داخل iframe سایت دیگه باز نشه (clickjacking)
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }, // فقط روی HTTPS اثر داره
  // CSP سبک و بی‌خطر: اسکریپت‌های inline خود Next رو نمی‌بنده؛ فقط iframe/base/object رو قفل می‌کنه
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
];

const nextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        // Service Worker (اعلان پوش) هیچ‌وقت نباید کش بشه تا نسخه‌ی جدید فوراً برسه
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
