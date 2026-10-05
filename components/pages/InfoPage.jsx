import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BottomNav from "@/components/BottomNav";

/** قالب مشترک صفحه‌های متنی (درباره‌ی ما، قوانین، سوالات متداول و…). کامپوننت سروریه. */
export default function InfoPage({ title, intro, children }) {
  return (
    <div className="flex min-h-dvh flex-col bg-slate-50 [&>*]:w-full font-[Number] text-slate-800">
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 md:py-10">
        <nav aria-label="مسیر صفحه" className="mb-4 flex items-center gap-1.5 text-xs text-slate-500">
          <Link href="/" className="transition hover:text-green-700">
            خانه
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-slate-700">{title}</span>
        </nav>

        <article className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-soft md:p-8">
          <h1 className="text-xl font-extrabold leading-9 text-slate-800 md:text-2xl">{title}</h1>
          {intro && <p className="mt-2 text-sm leading-7 text-slate-500">{intro}</p>}
          <div className="mt-6 space-y-7">{children}</div>
        </article>
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}

export function Section({ title, children }) {
  return (
    <section>
      <h2 className="mb-2.5 flex items-center gap-2 text-base font-extrabold text-slate-800">
        <span aria-hidden="true" className="h-5 w-1.5 rounded-full bg-linear-to-b from-green-400 to-green-700" />
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export function P({ children }) {
  return <p className="text-sm leading-8 text-slate-600">{children}</p>;
}

export function List({ items }) {
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5 text-sm leading-8 text-slate-600">
          <span aria-hidden="true" className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** کادر تأکید (مثلاً شرط مهم بازگشت کالا) */
export function Callout({ children }) {
  return <p className="rounded-2xl bg-green-50 px-4 py-3 text-sm font-medium leading-8 text-green-900">{children}</p>;
}

/** لینک داخل متن (مثلاً «هزینه و زمان ارسال») که مستقیم به همون بخش/صفحه می‌بره */
export function PageLink({ href, children }) {
  return (
    <Link href={href} className="font-bold text-green-700 underline underline-offset-4 transition hover:text-green-800">
      «{children}»
    </Link>
  );
}
