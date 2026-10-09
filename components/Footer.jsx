import Link from "next/link";
import { FaClock, FaLock, FaMapMarkerAlt, FaPhoneAlt, FaShieldAlt, FaShoppingBasket, FaTags, FaTruck } from "react-icons/fa";
import { STORE_INFO } from "@/lib/store-info";
import Reveal from "@/components/Reveal";

const SHOP_LINKS = [
  { label: "همه‌ی محصولات", href: "/products" },
  { label: "کالاهای شگفت‌انگیز", href: "/products?discounted=1" },
  { label: "سبد خرید", href: "/cart" },
];

const ACCOUNT_LINKS = [
  { label: "حساب کاربری", href: "/profile?tab=info" },
  { label: "سفارش‌های من", href: "/profile?tab=orders" },
  { label: "کیف پول", href: "/profile?tab=wallet" },
  { label: "آدرس‌های من", href: "/profile?tab=addresses" },
];

const INFO_LINKS = [
  { label: "هزینه و زمان ارسال", href: "/shipping-info" },
  { label: "بازگشت و تعویض کالا", href: "/returns" },
  { label: "سوالات متداول", href: "/faq" },
  { label: "درباره‌ی ما", href: "/about" },
  { label: "تماس با ما", href: "/contact" },
  { label: "قوانین و مقررات", href: "/terms" },
];

const TRUST = [
  { label: "ارسال سریع", icon: FaTruck },
  { label: "ضمانت اصالت کالا", icon: FaShieldAlt },
  { label: "پرداخت امن", icon: FaLock },
  { label: "قیمت مناسب", icon: FaTags },
];

function LinkColumn({ title, links }) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-extrabold text-slate-800">{title}</h3>
      <ul className="space-y-2">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="text-xs text-slate-500 transition hover:text-green-700">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** فوتر سایت. مشخصات تماس از lib/store-info.js می‌آد و اگه خالی باشه نمایش داده نمی‌شه. */
export default function Footer() {
  const year = new Intl.DateTimeFormat("fa-IR", { year: "numeric" }).format(new Date());
  const { name, phone, address, workingHours } = STORE_INFO;

  return (
    <footer className="mt-auto border-t border-slate-200/80 bg-white/70 pb-24 md:pb-0">
      <div className="mx-auto max-w-7xl px-4 py-8 md:py-10">
        {/* نوار مزیت‌ها */}
        <ul className="mb-8 grid grid-cols-2 gap-2.5 md:grid-cols-4">
          {TRUST.map(({ label, icon: Icon }, i) => (
            <Reveal
              as="li"
              key={label}
              from="bottom"
              delay={i * 70}
              className="flex items-center justify-center gap-2 rounded-2xl bg-green-100/70 px-3 py-3 text-xs font-medium text-green-800"
            >
              <Icon size={14} className="text-green-600" />
              {label}
            </Reveal>
          ))}
        </ul>

        <Reveal from="bottom" className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-[1.4fr_1fr_1fr_1fr_1.2fr]">
          {/* معرفی */}
          <div>
            <Link href="/" className="inline-flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-linear-to-br from-green-500 to-green-700 text-white shadow-brand">
                <FaShoppingBasket size={19} />
              </span>
              <span className="text-lg font-extrabold tracking-tight text-green-800">{name}</span>
            </Link>
            <p className="mt-3 max-w-xs text-xs leading-7 text-slate-500">
              خرید آنلاین مایحتاج روزانه، از خوراکی و لبنیات تا شوینده، با بهترین قیمت، کیفیت تضمین‌شده و ارسال سریع به درب منزل.
            </p>
          </div>

          <LinkColumn title="خرید از فروشگاه" links={SHOP_LINKS} />
          <LinkColumn title="حساب شما" links={ACCOUNT_LINKS} />
          <LinkColumn title="راهنما و اطلاعات" links={INFO_LINKS} />

          {/* تماس */}
          <div>
            <h3 className="mb-3 text-sm font-extrabold text-slate-800">ارتباط با ما</h3>
            {phone || address || workingHours ? (
              <ul className="space-y-2.5 text-xs text-slate-500">
                {phone && (
                  <li className="flex items-center gap-2">
                    <FaPhoneAlt size={12} className="shrink-0 text-green-600" />
                    <span dir="ltr">{phone}</span>
                  </li>
                )}
                {address && (
                  <li className="flex items-start gap-2 leading-6">
                    <FaMapMarkerAlt size={12} className="mt-1.5 shrink-0 text-green-600" />
                    {address}
                  </li>
                )}
                {workingHours && (
                  <li className="flex items-start gap-2 leading-6">
                    <FaClock size={12} className="mt-1.5 shrink-0 text-green-600" />
                    {workingHours}
                  </li>
                )}
              </ul>
            ) : (
              <p className="text-xs leading-7 text-slate-500">برای پیگیری سفارش‌ها از بخش «سفارش‌های من» در حساب کاربری استفاده کنید.</p>
            )}
          </div>
        </Reveal>

        <div className="mt-8 flex flex-col items-center justify-between gap-2 border-t border-slate-200/80 pt-5 text-xs text-slate-400 sm:flex-row">
          <p>
            © {year} {name}؛ تمامی حقوق محفوظ است.
          </p>
          <p>خرید امن، تازه و به‌صرفه</p>
        </div>
      </div>
    </footer>
  );
}
