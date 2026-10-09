"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FaCheck, FaCheckDouble, FaChevronDown, FaRegSquare, FaCheckSquare, FaRegTrashAlt } from "react-icons/fa";
import BroadcastComposer from "@/components/admin/BroadcastComposer";
import { Card, PageHeader } from "@/components/admin/ui";
import { useConfirm } from "@/components/providers/ConfirmProvider";
import { Spinner } from "@/components/ui/form";
import SwipeRow from "@/components/ui/SwipeRow";
import { api } from "@/lib/api-client";
import { formatNumber } from "@/lib/format";
import { notify } from "@/lib/toast";

const POLL_MS = 20_000;

const when = (iso) =>
  new Intl.DateTimeFormat("fa-IR", { timeZone: "Asia/Tehran", dateStyle: "medium", timeStyle: "short", hourCycle: "h23" }).format(new Date(iso));


/** یک تیک = ارسال شد | دو تیک خاکستری = بعضی‌ها خوندن | دو تیک آبی = همه خوندن */
function Ticks({ read, total, withCount = true }) {
  const all = total > 0 && read >= total;
  const some = read > 0;
  const Icon = some ? FaCheckDouble : FaCheck;
  const title = all ? "همه خوانده‌اند" : some ? `${formatNumber(read)} از ${formatNumber(total)} نفر خوانده‌اند` : "ارسال شد؛ هنوز کسی نخوانده";
  return (
    <span title={title} className={`inline-flex items-center gap-1 text-xs font-bold ${all ? "text-sky-500" : "text-slate-400"}`}>
      <Icon size={13} />
      {withCount && total > 1 && (
        <span>
          {formatNumber(read)}/{formatNumber(total)}
        </span>
      )}
    </span>
  );
}

// ───────────────────────── لیست ارسال‌شده‌ها ─────────────────────────

function Recipients({ id, refreshKey }) {
  const [rows, setRows] = useState(null);
  useEffect(() => {
    let live = true;
    api("GET", `/api/admin/notifications/${id}`)
      .then((d) => live && setRows(d.recipients))
      .catch(() => live && setRows([]));
    return () => {
      live = false;
    };
  }, [id, refreshKey]);

  if (rows === null) return <div className="flex justify-center py-4 text-slate-400"><Spinner /></div>;
  return (
    <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100 bg-slate-50/60">
      {rows.map((r) => (
        <li key={r.id} className="flex items-center gap-3 px-3 py-2 text-xs">
          <Ticks read={r.readAt ? 1 : 0} total={1} withCount={false} />
          <span className="font-medium text-slate-700">{r.name || r.phone}</span>
          {r.name && (
            <span className="text-slate-400" dir="ltr">
              {r.phone}
            </span>
          )}
          <span className="ms-auto text-slate-400">{r.readAt ? `خوانده شد: ${when(r.readAt)}` : "نخوانده"}</span>
        </li>
      ))}
      {rows.length === 300 && <li className="px-3 py-2 text-center text-[11px] text-slate-400">فقط ۳۰۰ گیرنده‌ی اول نمایش داده می‌شود.</li>}
    </ul>
  );
}

export default function NotificationsAdmin({ initial }) {
  const confirm = useConfirm();
  const [items, setItems] = useState(initial.broadcasts);
  const [nextCursor, setNextCursor] = useState(initial.nextCursor);
  const [total, setTotal] = useState(initial.total);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const [openId, setOpenId] = useState(null);
  const [tick, setTick] = useState(0); // با هر polling جدید، لیست گیرنده‌ی بازشده هم تازه می‌شه
  const [nonce, setNonce] = useState(0); // برای برگرداندن ردیفی که کشیده شد ولی حذفش تأیید نشد
  const nextRef = useRef(nextCursor);
  nextRef.current = nextCursor;

  // تازه‌کردن دوره‌ای: تعداد «خوانده‌شده»ها (دو تیک) و پیام‌های تازه
  const refresh = useCallback(async () => {
    try {
      const data = await api("GET", "/api/admin/notifications");
      setTotal(data.total);
      setItems((prev) => {
        const fresh = new Map(data.broadcasts.map((b) => [b.id, b]));
        const known = new Set(prev.map((b) => b.id));
        const updated = prev.map((b) => (fresh.has(b.id) ? { ...b, readCount: fresh.get(b.id).readCount } : b));
        const added = data.broadcasts.filter((b) => !known.has(b.id));
        return [...added, ...updated];
      });
      setTick((t) => t + 1);
    } catch {}
  }, []);

  useEffect(() => {
    const id = setInterval(() => document.visibilityState === "visible" && refresh(), POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await api("GET", `/api/admin/notifications?cursor=${encodeURIComponent(nextCursor)}`);
      setItems((prev) => {
        const known = new Set(prev.map((b) => b.id));
        return [...prev, ...data.broadcasts.filter((b) => !known.has(b.id))];
      });
      setNextCursor(data.nextCursor);
    } catch (err) {
      notify.error(err.message);
    } finally {
      setLoadingMore(false);
    }
  }

  async function removeMany({ ids, all }) {
    try {
      await api("DELETE", "/api/admin/notifications", all ? { all: true } : { ids });
      if (all) {
        setItems([]);
        setNextCursor(null);
        setTotal(0);
      } else {
        const gone = new Set(ids);
        setItems((prev) => prev.filter((b) => !gone.has(b.id)));
        setTotal((t) => Math.max(0, t - ids.length));
      }
      setSelected(new Set());
      notify.success("حذف شد (از لیست همه‌ی گیرنده‌ها هم پاک شد)");
      return true;
    } catch (err) {
      notify.error(err.message);
      return false;
    }
  }

  async function removeOne(b) {
    const okay = await confirm({
      title: "حذف پیام",
      description: `«${b.title}» هم از اینجا و هم از لیست اعلان‌های همه‌ی گیرنده‌ها پاک می‌شود.`,
      confirmText: "حذف",
    });
    if (!okay) return setNonce((n) => n + 1);
    if (!(await removeMany({ ids: [b.id] }))) setNonce((n) => n + 1);
  }

  async function removeSelected() {
    const ids = [...selected];
    const okay = await confirm({
      title: `حذف ${formatNumber(ids.length)} پیام`,
      description: "پیام‌های انتخاب‌شده از لیست همه‌ی گیرنده‌ها هم پاک می‌شوند.",
      confirmText: "حذف",
    });
    if (okay) await removeMany({ ids });
  }

  async function removeAllMessages() {
    const okay = await confirm({
      title: "حذف همه‌ی پیام‌ها",
      description: "همه‌ی پیام‌های ارسالی از اینجا و از لیست اعلان‌های همه‌ی کاربران پاک می‌شود. این کار قابل بازگشت نیست.",
      confirmText: "حذف همه",
    });
    if (okay) await removeMany({ all: true });
  }

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="grid gap-4">
      <PageHeader title="ارسال پیام به کاربران" description="پیام برای یک یا چند کاربر (یا همه) به‌صورت اعلان می‌رسد. وقتی کاربر آن را باز کند، دو تیک می‌خورد." />

      <BroadcastComposer
        latest={items[0]}
        onSent={(b) => {
          setItems((prev) => [b, ...prev]);
          setTotal((t) => t + 1);
        }}
      />

      <Card title={`پیام‌های ارسال‌شده (${formatNumber(total)})`}>
        {items.length > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSelected(selected.size === items.length ? new Set() : new Set(items.map((b) => b.id)))}
              className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200"
            >
              {selected.size === items.length ? "لغو انتخاب همه" : "انتخاب همه"}
            </button>
            {selected.size > 0 && (
              <button type="button" onClick={removeSelected} className="flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-2 text-xs font-bold text-white hover:bg-red-600">
                <FaRegTrashAlt size={11} /> حذف انتخاب‌شده‌ها ({formatNumber(selected.size)})
              </button>
            )}
            <button type="button" onClick={removeAllMessages} className="ms-auto flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-100">
              <FaRegTrashAlt size={11} /> حذف همه
            </button>
          </div>
        )}

        {items.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">هنوز پیامی نفرستاده‌اید.</p>
        ) : (
          <>
            <p className="mb-2 text-[11px] text-slate-400 sm:hidden">برای حذف سریع، ردیف را به چپ یا راست بکشید.</p>
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-100">
              {items.map((b) => {
                const open = openId === b.id;
                return (
                  <li key={b.id}>
                    <SwipeRow key={`${b.id}-${nonce}`} onDismiss={() => removeOne(b)}>
                      <div className={`flex items-start gap-3 px-3 py-3 ${selected.has(b.id) ? "bg-green-50/60" : ""}`}>
                        <button
                          type="button"
                          onClick={() => toggle(b.id)}
                          aria-label={selected.has(b.id) ? "لغو انتخاب" : "انتخاب"}
                          className={`mt-0.5 shrink-0 ${selected.has(b.id) ? "text-green-600" : "text-slate-300 hover:text-slate-400"}`}
                        >
                          {selected.has(b.id) ? <FaCheckSquare size={18} /> : <FaRegSquare size={18} />}
                        </button>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-extrabold text-slate-800">{b.title}</span>
                            <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700">
                              {b.audience === "ALL" ? "همه‌ی کاربران" : `${formatNumber(b.recipientCount)} کاربر`}
                            </span>
                          </div>
                          <p className="mt-1 break-words text-xs leading-6 text-slate-600">{b.body}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
                            <Ticks read={b.readCount} total={b.recipientCount} />
                            <span>{when(b.createdAt)}</span>
                            <span>توسط {b.adminName}</span>
                            <button
                              type="button"
                              onClick={() => setOpenId(open ? null : b.id)}
                              className="flex items-center gap-1 font-bold text-green-700 hover:underline"
                            >
                              وضعیت هر گیرنده <FaChevronDown size={9} className={open ? "rotate-180" : ""} />
                            </button>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeOne(b)}
                          aria-label="حذف پیام"
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <FaRegTrashAlt size={13} />
                        </button>
                      </div>
                    </SwipeRow>
                    {open && (
                      <div className="border-t border-slate-100 bg-white p-3">
                        <Recipients id={b.id} refreshKey={tick} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>

            {nextCursor && (
              <div className="mt-3 flex justify-center">
                <button type="button" onClick={loadMore} disabled={loadingMore} className="rounded-full bg-slate-100 px-5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200">
                  {loadingMore ? <Spinner /> : "نمایش پیام‌های قدیمی‌تر"}
                </button>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
