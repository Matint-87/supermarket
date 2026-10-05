import InfoPage, { Callout, List, P, PageLink, Section } from "@/components/pages/InfoPage";
import { RETURN_WINDOW_DAYS, STORE_INFO } from "@/lib/store-info";
import { formatNumber } from "@/lib/format";

export const metadata = { title: `بازگشت و تعویض کالا | ${STORE_INFO.name}` };

export default function ReturnsPage() {
  const days = formatNumber(RETURN_WINDOW_DAYS);

  return (
    <InfoPage title="بازگشت و تعویض کالا" intro="شرایط مرجوع‌کردن یا تعویض کالا در سوپرمارکت رحیمی.">
      <Callout>
        بازگشت یا تعویض کالا فقط با مراجعه‌ی حضوری به فروشگاه انجام می‌شود. ارسال کالای مرجوعی با پست یا پیک پذیرفته
        نمی‌شود.
      </Callout>

      <Section title="شرایط پذیرش">
        <List
          items={[
            `حداکثر ${days} روز پس از تحویل سفارش به فروشگاه مراجعه کنید.`,
            "فاکتور یا کد ۸ رقمی سفارش را همراه داشته باشید.",
            "کالا باید سالم، استفاده‌نشده و در بسته‌بندی اصلی باشد.",
            "کالای معیوب، تاریخ‌گذشته یا متفاوت با سفارش، پس از بررسی در فروشگاه تعویض یا مرجوع می‌شود.",
          ]}
        />
      </Section>

      <Section title="کالاهایی که قابل بازگشت نیستند">
        <P>
          به دلیل ماهیت کالاهای خوراکی و بهداشتی، کالاهای فاسدشدنی و کالاهایی که بسته‌بندی آن‌ها باز شده است، قابل
          بازگشت نیستند؛ مگر آنکه هنگام تحویل ایراد داشته باشند.
        </P>
      </Section>

      <Section title="مراحل بازگشت یا تعویض">
        <List
          items={[
            "کالا و فاکتور را به فروشگاه ببرید.",
            "کالا در فروشگاه بررسی می‌شود.",
            "در صورت تأیید، کالا تعویض می‌شود یا بازگشت آن ثبت می‌شود. نحوه‌ی بازگشت وجه هنگام بررسی در فروشگاه مشخص می‌شود.",
          ]}
        />
      </Section>

      <Section title="لغو سفارش پیش از ارسال">
        <P>
          تا زمانی که سفارش در وضعیت «در انتظار بررسی» است، می‌توانید آن را از بخش{" "}
          <PageLink href="/profile?tab=orders">سفارش‌های من</PageLink> لغو کنید. در این صورت مبلغ پرداخت‌شده به <PageLink href="/profile?tab=wallet">کیف پول</PageLink> شما برمی‌گردد.
        </P>
      </Section>
    </InfoPage>
  );
}
