import Link from "next/link";
import { FaClock, FaEnvelope, FaMapMarkerAlt, FaPhoneAlt } from "react-icons/fa";
import InfoPage, { P, Section } from "@/components/pages/InfoPage";
import { STORE_INFO } from "@/lib/store-info";

export const metadata = { title: `تماس با ما | ${STORE_INFO.name}` };

export default function ContactPage() {
  const rows = [
    { icon: FaPhoneAlt, label: "تلفن", value: STORE_INFO.phone, ltr: true, href: STORE_INFO.phone ? `tel:${STORE_INFO.phone.replace(/[^\d+]/g, "")}` : null },
    { icon: FaMapMarkerAlt, label: "آدرس فروشگاه", value: STORE_INFO.address },
    { icon: FaClock, label: "ساعات کاری", value: STORE_INFO.workingHours },
    { icon: FaEnvelope, label: "ایمیل", value: STORE_INFO.email, ltr: true, href: STORE_INFO.email ? `mailto:${STORE_INFO.email}` : null },
  ].filter((r) => r.value);

  return (
    <InfoPage title="تماس با ما" intro="برای سؤال، پیگیری سفارش یا بازگشت کالا از راه‌های زیر با ما در ارتباط باشید.">
      <Section title="اطلاعات تماس">
        {rows.length > 0 ? (
          <ul className="grid gap-3 sm:grid-cols-2">
            {rows.map(({ icon: Icon, label, value, ltr, href }) => (
              <li key={label} className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-green-100 text-green-700">
                  <Icon size={14} />
                </span>
                <div className="min-w-0">
                  <p className="text-xs text-slate-500">{label}</p>
                  {href ? (
                    <a href={href} dir={ltr ? "ltr" : undefined} className="mt-0.5 block text-sm font-bold text-slate-800 hover:text-green-700">
                      {value}
                    </a>
                  ) : (
                    <p dir={ltr ? "ltr" : undefined} className="mt-0.5 text-sm font-bold leading-7 text-slate-800">
                      {value}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <P>اطلاعات تماس فروشگاه به‌زودی در این صفحه قرار می‌گیرد.</P>
        )}
      </Section>

      <Section title="پیگیری سفارش">
        <P>
          وضعیت هر سفارش (ثبت، آماده‌سازی، ارسال و تحویل) را می‌توانید از{" "}
          <Link href="/profile?tab=orders" className="font-bold text-green-700 underline underline-offset-4">
            سفارش‌های من
          </Link>{" "}
          ببینید. هنگام تماس، کد ۸ رقمی سفارش را در دسترس داشته باشید.
        </P>
      </Section>
    </InfoPage>
  );
}
