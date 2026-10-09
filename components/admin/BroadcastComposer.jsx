"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FaBullhorn, FaCheckCircle, FaChevronDown, FaClock, FaEye, FaLink, FaPaperPlane, FaPen, FaRegClone, FaSearch, FaUserFriends, FaUsers,
} from "react-icons/fa";
import { Card, UserAvatar } from "@/components/admin/ui";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner, inputCls } from "@/components/ui/form";
import { api } from "@/lib/api-client";
import { formatNumber } from "@/lib/format";
import { BROADCAST_BODY_MAX, BROADCAST_MAX_SELECTED, BROADCAST_TITLE_MAX } from "@/lib/notification-constants";
import { notify } from "@/lib/toast";

const userLabel = (u) => [u.firstName, u.lastName].filter(Boolean).join(" ") || u.phone;

/** قالب‌های آماده؛ با انتخاب یکی، عنوان و متن پر می‌شن (قابل ویرایش) */
const TEMPLATES = [
  { name: "تخفیف ویژه", title: "تخفیف ویژه امروز", body: "سلام! امروز تمام محصولات سوپرمارکت با تخفیف ویژه در دسترس شماست. فرصت را از دست ندهید! 🎉" },
  { name: "ارسال رایگان", title: "ارسال رایگان برای شما", body: "سفارش‌های امروز شما با ارسال رایگان به دستتان می‌رسد. همین حالا خرید کنید 🛒" },
  { name: "محصولات تازه", title: "محصولات تازه رسید", body: "محصولات تازه به فروشگاه اضافه شد. سر بزنید و اولین نفری باشید که می‌خرد 🌿" },
  { name: "اطلاعیه", title: "اطلاعیه فروشگاه", body: "مشتری گرامی، برای اطلاع از آخرین تغییرات فروشگاه به سایت سر بزنید." },
];


/** ───────────── ستون انتخاب کاربران ───────────── */
function UserSelector({ audience, setAudience, selected, setSelected, onTotal, error }) {
  const [q, setQ] = useState("");
  const [users, setUsers] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [total, setTotal] = useState(null);
  const [busy, setBusy] = useState(true);
  const [more, setMore] = useState(false);
  const seq = useRef(0);

  const fetchPage = useCallback(async (query, after) => {
    const params = new URLSearchParams({ role: "USER", status: "active" });
    if (query.trim()) params.set("q", query.trim());
    if (after) params.set("cursor", after);
    return api("GET", `/api/admin/users?${params}`);
  }, []);

  // اولین صفحه و جست‌وجو (با تأخیر ۳۰۰ میلی‌ثانیه تا با هر حرف درخواست نره)
  useEffect(() => {
    const mine = ++seq.current;
    setBusy(true);
    const t = setTimeout(async () => {
      try {
        const data = await fetchPage(q, null);
        if (mine !== seq.current) return;
        setUsers(data.users);
        setCursor(data.nextCursor);
        setTotal(data.total);
        if (!q.trim()) onTotal?.(data.total);
      } catch {
        if (mine === seq.current) setUsers([]);
      } finally {
        if (mine === seq.current) setBusy(false);
      }
    }, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [q, fetchPage, onTotal]);

  async function loadMore() {
    if (!cursor || more) return;
    setMore(true);
    try {
      const data = await fetchPage(q, cursor);
      setUsers((prev) => {
        const known = new Set(prev.map((u) => u.id));
        return [...prev, ...data.users.filter((u) => !known.has(u.id))];
      });
      setCursor(data.nextCursor);
    } catch (err) {
      notify.error(err.message);
    } finally {
      setMore(false);
    }
  }

  function toggle(u) {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(u.id)) next.delete(u.id);
      else if (next.size >= BROADCAST_MAX_SELECTED) notify.warning(`حداکثر ${formatNumber(BROADCAST_MAX_SELECTED)} کاربر`);
      else next.set(u.id, u);
      return next;
    });
  }

  const allVisible = users.length > 0 && users.every((u) => selected.has(u.id));
  function toggleAll() {
    setSelected((prev) => {
      const next = new Map(prev);
      if (allVisible) users.forEach((u) => next.delete(u.id));
      else {
        for (const u of users) {
          if (next.size >= BROADCAST_MAX_SELECTED) {
            notify.warning(`حداکثر ${formatNumber(BROADCAST_MAX_SELECTED)} کاربر`);
            break;
          }
          next.set(u.id, u);
        }
      }
      return next;
    });
  }

  const tab = (value, label, Icon) => (
    <button
      type="button"
      onClick={() => setAudience(value)}
      aria-pressed={audience === value}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2.5 text-xs font-bold transition ${
        audience === value ? "border-green-600 bg-green-50 text-green-700" : "border-transparent text-slate-500 hover:text-slate-700"
      }`}
    >
      <Icon size={12} /> {label}
    </button>
  );

  return (
    <Card className="flex flex-col lg:order-3">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-extrabold text-slate-800">انتخاب کاربران</h2>
        <FaUserFriends className="text-green-600" size={16} />
      </div>

      <div className="flex gap-1 rounded-xl bg-slate-100 p-1" role="group" aria-label="مخاطب پیام">
        {tab("ALL", "همه کاربران", FaUsers)}
        {tab("SELECTED", "کاربران منتخب", FaUserFriends)}
      </div>

      {audience === "ALL" ? (
        <div className="mt-4 flex flex-1 flex-col items-center justify-center gap-2 rounded-xl bg-green-50/60 px-4 py-10 text-center">
          <FaUsers className="text-green-600" size={26} />
          <p className="text-sm font-extrabold text-slate-800">{total === null ? "…" : formatNumber(total)} کاربر فعال</p>
          <p className="text-xs leading-6 text-slate-500">پیام برای همه‌ی مشتری‌های فعال فرستاده می‌شود.</p>
        </div>
      ) : (
        <>
          <div className="relative mt-3">
            <FaSearch className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="جستجوی کاربر…"
              aria-label="جستجوی کاربر"
              className={`${inputCls(Boolean(error))} h-11 bg-slate-50 ps-10`}
            />
            {busy && <Spinner className="absolute end-4 top-1/2 -translate-y-1/2 text-slate-400" />}
          </div>
          {error && <p role="alert" className="mt-1.5 text-xs text-red-600">{error}</p>}

          <label className="mt-3 flex cursor-pointer items-center justify-between border-b border-slate-100 pb-3 text-xs font-bold text-slate-600">
            <span>
              انتخاب همه
              {selected.size > 0 && <span className="ms-2 font-medium text-green-700">({formatNumber(selected.size)} نفر انتخاب شده)</span>}
            </span>
            <Checkbox checked={allVisible} onCheckedChange={toggleAll} aria-label="انتخاب همه‌ی کاربران نمایش‌داده‌شده" />
          </label>

          <ul className="max-h-[22rem] flex-1 divide-y divide-slate-100 overflow-y-auto" aria-busy={busy}>
            {users.map((u) => (
              <li key={u.id}>
                <label className="flex cursor-pointer items-center gap-3 py-2.5">
                  <Checkbox checked={selected.has(u.id)} onCheckedChange={() => toggle(u)} aria-label={`انتخاب ${userLabel(u)}`} />
                  <UserAvatar user={u} size={32} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-800">{userLabel(u)}</span>
                    <span className="block text-[11px] text-slate-400" dir="ltr">{u.phone}</span>
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500" title="تعداد سفارش‌ها">
                    {formatNumber(u.orderCount)}
                  </span>
                </label>
              </li>
            ))}
            {!busy && users.length === 0 && <li className="py-8 text-center text-xs text-slate-400">کاربری پیدا نشد.</li>}
          </ul>

          {cursor && (
            <button
              type="button"
              onClick={loadMore}
              disabled={more}
              className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100"
            >
              {more ? <Spinner /> : <FaChevronDown size={10} />} نمایش کاربران بیشتر
            </button>
          )}
        </>
      )}
    </Card>
  );
}

/** ───────────── پیش‌نمایش به شکل اعلان ───────────── */
function Preview({ title, body }) {
  const time = useMemo(() => new Intl.DateTimeFormat("fa-IR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date()), [title, body]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Card className="lg:order-1">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-extrabold text-slate-800">پیش‌نمایش پیام</h2>
        <FaEye className="text-slate-500" size={15} />
      </div>
      <div className="rounded-2xl bg-slate-100/80 p-4">
        <div className="rounded-2xl rounded-ss-md bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center gap-2 text-xs font-extrabold text-slate-800">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-green-700">
              <FaBullhorn size={11} />
            </span>
            سوپرمارکت
          </div>
          <p className="break-words text-sm font-bold leading-7 text-slate-800">{title.trim() || "عنوان پیام"}</p>
          <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-6 text-slate-600">{body.trim() || "متن پیام شما اینجا نمایش داده می‌شود."}</p>
          <p className="mt-2 text-end text-[11px] text-slate-400">{time}</p>
        </div>
      </div>
    </Card>
  );
}

/** ───────────── وضعیت آخرین ارسال ───────────── */
function StatusCard({ latest, activeTotal }) {
  const sent = latest?.recipientCount ?? 0;
  const read = latest?.readCount ?? 0;
  const unread = Math.max(0, sent - read);
  const pct = sent ? Math.round((read / sent) * 100) : 0;
  const row = (label, value, tone, Icon) => (
    <li className="flex items-center justify-between py-2 text-xs">
      <span className="flex items-center gap-2 text-slate-500">
        <Icon className={tone} size={14} /> {label}
      </span>
      <span className="font-extrabold text-slate-800">{formatNumber(value)}</span>
    </li>
  );
  return (
    <Card className="lg:order-2">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-sm font-extrabold text-slate-800">وضعیت ارسال</h2>
        <FaPaperPlane className="text-green-600" size={14} />
      </div>
      <p className="mb-2 text-[11px] text-slate-400">{latest ? `آخرین پیام: «${latest.title}»` : "هنوز پیامی نفرستاده‌اید."}</p>
      <ul className="divide-y divide-slate-100">
        {row("تعداد کل کاربران فعال", activeTotal ?? 0, "text-slate-400", FaUsers)}
        {row("ارسال شده", sent, "text-green-600", FaCheckCircle)}
        {row("خوانده شده", read, "text-sky-500", FaEye)}
        {row("هنوز نخوانده", unread, "text-amber-500", FaClock)}
      </ul>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="درصد خوانده‌شده">
        <div className="h-full rounded-full bg-green-600 transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1.5 text-[11px] font-bold text-green-700">{formatNumber(pct)}٪ خوانده شده</p>
    </Card>
  );
}

/** ───────────── ستون نوشتن پیام + دکمه‌ی ارسال ───────────── */
export default function BroadcastComposer({ latest, onSent }) {
  const confirm = useConfirm();
  const [audience, setAudience] = useState("SELECTED");
  const [selected, setSelected] = useState(() => new Map());
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [showLink, setShowLink] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [activeTotal, setActiveTotal] = useState(null);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const recipientText = audience === "ALL" ? `همه‌ی ${formatNumber(activeTotal ?? 0)} کاربر` : `${formatNumber(selected.size)} کاربر`;

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    if (audience === "ALL") {
      const okay = await confirm({
        title: "ارسال به همه‌ی کاربران",
        description: "این پیام برای تک‌تکِ مشتری‌های فعال فرستاده می‌شود. ادامه می‌دهید؟",
        confirmText: "ارسال به همه",
      });
      if (!okay) return;
    }
    setBusy(true);
    setErrors({});
    try {
      const data = await api("POST", "/api/admin/notifications", {
        title,
        body,
        url: url.trim() || null,
        audience,
        ...(audience === "SELECTED" && { userIds: [...selected.keys()] }),
      });
      notify.success(`پیام برای ${formatNumber(data.recipientCount)} نفر ارسال شد`);
      setTitle("");
      setBody("");
      setUrl("");
      setShowLink(false);
      setSelected(new Map());
      onSent(data.broadcast);
    } catch (err) {
      setErrors(err.fields ?? {});
      notify.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  function applyTemplate(t) {
    setTitle(t.title);
    setBody(t.body);
    setShowTemplates(false);
  }

  const secondary =
    "flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs font-bold text-slate-600 transition hover:bg-slate-100";

  return (
    <form onSubmit={submit} noValidate className="grid items-start gap-4 lg:grid-cols-3">
      <UserSelector audience={audience} setAudience={setAudience} selected={selected} setSelected={setSelected} onTotal={setActiveTotal} error={errors.userIds} />

      <div className="grid gap-4 lg:order-2">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-slate-800">نوشتن پیام</h2>
            <FaPen className="text-green-600" size={14} />
          </div>

          <label htmlFor="bc-title" className="mb-1.5 block text-xs font-bold text-slate-700">عنوان پیام</label>
          <input id="bc-title" value={title} maxLength={BROADCAST_TITLE_MAX} onChange={(e) => setTitle(e.target.value)} className={inputCls(Boolean(errors.title))} />
          <div className="mt-1 flex justify-between text-[11px]">
            <span className="text-red-600">{errors.title}</span>
            <span className="text-slate-400">{formatNumber(title.length)}/{formatNumber(BROADCAST_TITLE_MAX)}</span>
          </div>

          <label htmlFor="bc-body" className="mb-1.5 mt-3 block text-xs font-bold text-slate-700">متن پیام</label>
          <textarea
            id="bc-body"
            value={body}
            maxLength={BROADCAST_BODY_MAX}
            rows={5}
            onChange={(e) => setBody(e.target.value)}
            className={`${inputCls(Boolean(errors.body))} h-auto resize-y py-3 leading-7`}
          />
          <div className="mt-1 flex justify-between text-[11px]">
            <span className="text-red-600">{errors.body}</span>
            <span className="text-slate-400">{formatNumber(body.length)}/{formatNumber(BROADCAST_BODY_MAX)}</span>
          </div>

          <div className="relative mt-3 flex gap-2">
            <button type="button" onClick={() => setShowLink((v) => !v)} aria-expanded={showLink} className={secondary}>
              <FaLink size={12} /> افزودن لینک
            </button>
            <button type="button" onClick={() => setShowTemplates((v) => !v)} aria-expanded={showTemplates} className={secondary}>
              <FaRegClone size={12} /> استفاده از قالب
            </button>
            {showTemplates && (
              <ul className="absolute inset-x-0 top-full z-10 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                {TEMPLATES.map((t) => (
                  <li key={t.name}>
                    <button type="button" onClick={() => applyTemplate(t)} className="block w-full px-4 py-2.5 text-start text-xs hover:bg-slate-50">
                      <span className="block font-bold text-slate-800">{t.name}</span>
                      <span className="block truncate text-slate-400">{t.body}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {(showLink || url || errors.url) && (
            <div className="mt-3 animate-fade-up">
              <label htmlFor="bc-url" className="mb-1.5 block text-xs font-bold text-slate-700">لینک (اختیاری)</label>
              <input id="bc-url" dir="ltr" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="/products?discounted=1" className={inputCls(Boolean(errors.url))} />
              <p className={`mt-1 text-[11px] ${errors.url ? "text-red-600" : "text-slate-400"}`}>{errors.url || "با لمس پیام، کاربر به این صفحه می‌رود."}</p>
            </div>
          )}
        </Card>

        <Card>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-extrabold text-slate-800">تنظیمات ارسال</h2>
            <FaClock className="text-slate-500" size={14} />
          </div>
          <p className="text-xs leading-6 text-slate-500">
            ارسال فوری: پیام بلافاصله به اعلان‌های کاربران می‌رسد و روی دستگاه‌هایی که اعلان را فعال کرده‌اند هم با صدا نمایش داده می‌شود.
          </p>
          <button
            type="submit"
            disabled={busy || (audience === "SELECTED" && selected.size === 0)}
            className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-green-600 text-sm font-bold text-white shadow-sm transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? <Spinner /> : <FaPaperPlane size={13} />} ارسال فوری به {recipientText}
          </button>
        </Card>
      </div>

      <div className="grid gap-4 lg:contents">
        <Preview title={title} body={body} />
        <StatusCard latest={latest} activeTotal={activeTotal} />
      </div>
    </form>
  );
}
