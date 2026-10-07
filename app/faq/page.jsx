import { buildMetadata } from "@/lib/seo";
import { FaChevronDown } from "react-icons/fa";
import InfoPage, { PageLink } from "@/components/pages/InfoPage";
import { RETURN_WINDOW_DAYS, STORE_INFO } from "@/lib/store-info";
import { formatNumber } from "@/lib/format";

export const metadata = buildMetadata({
  title: "سوالات متداول",
  description: `پاسخ سوالات رایج درباره ثبت سفارش، پرداخت، ارسال، پیگیری و بازگشت کالا در ${STORE_INFO.name}.`,
  path: "/faq",
});

const FAQ = [
  {
    q: "چطور سفارش ثبت کنم؟",
    a: (
      <>
        کالاها را به <PageLink href="/cart">سبد خرید</PageLink> اضافه کنید، آدرس و روش ارسال را انتخاب کنید و سفارش را ثبت کنید. بعد از ثبت می‌توانید از بخش <PageLink href="/profile?tab=orders">سفارش‌های من</PageLink> پرداخت را انجام دهید.
      </>
    ),
  },
  {
    q: "روش‌های پرداخت چیست؟",
    a: "پرداخت آنلاین از درگاه بانکی یا استفاده از اعتبار کیف پول. اگر اعتبار کیف پول کافی نباشد، باقی مبلغ را می‌توانید آنلاین پرداخت کنید.",
  },
  {
    q: "هزینه و زمان ارسال چقدر است؟",
    a: (
      <>
        بستگی به شهر مقصد و روش ارسال دارد و هنگام انتخاب روش ارسال در سبد خرید نمایش داده می‌شود. جزئیات کامل در صفحه‌ی{" "}
        <PageLink href="/shipping-info">هزینه و زمان ارسال</PageLink> است.
      </>
    ),
  },
  {
    q: "سفارشم را چطور پیگیری کنم؟",
    a: (
      <>
        از <PageLink href="/profile?tab=orders">سفارش‌های من</PageLink> در حساب کاربری. مراحل ثبت، آماده‌سازی، ارسال و تحویل همراه با زمان هر مرحله نمایش داده می‌شود. اگر سفارش با پست ارسال شود، کد رهگیری هم همان‌جا قرار می‌گیرد.
      </>
    ),
  },
  {
    q: "می‌توانم سفارش را لغو کنم؟",
    a: (
      <>
        بله، تا زمانی که سفارش در وضعیت «در انتظار بررسی» است و از بخش <PageLink href="/profile?tab=orders">سفارش‌های من</PageLink>. مبلغ پرداخت‌شده بعد از لغو به <PageLink href="/profile?tab=wallet">کیف پول</PageLink> شما برمی‌گردد.
      </>
    ),
  },
  {
    q: "بازگشت یا تعویض کالا چگونه است؟",
    a: (
      <>
        فقط با مراجعه‌ی حضوری به فروشگاه و تا {formatNumber(RETURN_WINDOW_DAYS)} روز پس از تحویل، همراه با فاکتور و در صورت سالم‌بودن کالا. جزئیات در صفحه‌ی <PageLink href="/returns">بازگشت و تعویض کالا</PageLink> آمده است.
      </>
    ),
  },
  {
    q: "پول سفارش لغوشده کجا می‌رود؟",
    a: (
      <>
        به کیف پول شما در سایت برمی‌گردد و در سفارش‌های بعدی قابل استفاده است. موجودی و گردش کیف پول را از بخش <PageLink href="/profile?tab=wallet">کیف پول</PageLink> حساب کاربری ببینید.
      </>
    ),
  },
  {
    q: "می‌توانم سفارش را از فروشگاه تحویل بگیرم؟",
    a: "بله، اگر در سبد خرید روش «دریافت حضوری از فروشگاه» فعال باشد، می‌توانید آن را انتخاب کنید و پس از آماده‌شدن سفارش، از فروشگاه تحویل بگیرید.",
  },
  {
    q: "کد تأیید پیامکی به دستم نمی‌رسد، چه کنم؟",
    a: "چند دقیقه صبر کنید و دوباره درخواست کد بدهید. شماره موبایل را هم یک‌بار بررسی کنید. اگر مشکل ادامه داشت، با فروشگاه تماس بگیرید.",
  },
];

export default function FaqPage() {
  return (
    <InfoPage title="سوالات متداول" intro="پاسخ سؤال‌های رایج درباره‌ی خرید، ارسال و بازگشت کالا.">
      <div className="space-y-2.5">
        {FAQ.map((item) => (
          <details key={item.q} className="group rounded-2xl border border-slate-200/80 bg-slate-50/60 open:bg-white open:shadow-soft">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 text-sm font-bold text-slate-800 [&::-webkit-details-marker]:hidden">
              {item.q}
              <FaChevronDown size={11} className="shrink-0 text-slate-400 transition group-open:rotate-180" />
            </summary>
            <p className="px-4 pb-4 text-sm leading-8 text-slate-600">{item.a}</p>
          </details>
        ))}
      </div>
    </InfoPage>
  );
}
