// پخش لحظه‌ای اعلان‌ها بین پروسه‌ها با PostgreSQL LISTEN/NOTIFY + نگه‌داشتن اتصال SSE مرورگرها.
//   • publish(): یک پیام روی کانال Postgres می‌ذاره (از هر پروسه‌ای که سفارش/تغییر وضعیت رو انجام داده).
//   • subscribe(): مسیر /api/notifications/stream برای هر مرورگر باز یک callback ثبت می‌کنه.
//   • هر پروسه‌ی Node فقط «یک» اتصال LISTEN داره؛ اگه سرور چندتا instance/cluster باشه هم همه‌شون پیام رو می‌گیرن.
// نیاز به سرور همیشه‌روشن (VPS / pm2 / docker) داره؛ روی سرورلس (Vercel) اتصال SSE و LISTEN دوام نمی‌آره.
import "server-only";
import { Pool, Client } from "pg";

const CHANNEL = "shop_notifications";

// state روی globalThis می‌مونه تا با HMR در dev یا جدا بودن bundleها چند کپی ساخته نشه
const g = globalThis;
const state = (g.__shopRealtime ??= {
  subs: new Map(), // userId -> Set<callback>
  client: null,
  connecting: false,
  pool: null,
});

function connectionString() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("متغیر محیطی DATABASE_URL تنظیم نشده (فایل .env).");
  return url;
}

function dispatch(message) {
  const set = state.subs.get(message.userId);
  if (!set) return;
  for (const send of set) {
    try {
      send(message.notification);
    } catch {
      // اتصال بسته‌شده؛ با abort همون درخواست از لیست حذف می‌شه
    }
  }
}

function scheduleReconnect() {
  state.client = null;
  state.connecting = false;
  if (state.subs.size === 0) return; // کسی گوش نمی‌ده؛ دفعه‌ی بعد که subscribe شد وصل می‌شیم
  setTimeout(ensureListener, 3000).unref?.();
}

async function ensureListener() {
  if (state.client || state.connecting) return;
  state.connecting = true;
  try {
    const client = new Client({ connectionString: connectionString() });
    client.on("error", (err) => {
      console.error("[realtime] خطای اتصال LISTEN:", err.message);
      client.end().catch(() => {});
      scheduleReconnect();
    });
    client.on("end", scheduleReconnect);
    client.on("notification", (msg) => {
      try {
        dispatch(JSON.parse(msg.payload));
      } catch {
        // پیام خراب؛ نادیده گرفته می‌شه
      }
    });
    await client.connect();
    await client.query(`LISTEN ${CHANNEL}`);
    state.client = client;
    state.connecting = false;
  } catch (err) {
    console.error("[realtime] وصل‌شدن به LISTEN ممکن نشد:", err.message);
    scheduleReconnect();
  }
}

/** ثبت یک مشترک برای کاربر؛ تابعِ لغو اشتراک برمی‌گردونه */
export function subscribe(userId, send) {
  let set = state.subs.get(userId);
  if (!set) state.subs.set(userId, (set = new Set()));
  set.add(send);
  ensureListener();
  return () => {
    set.delete(send);
    if (set.size === 0) state.subs.delete(userId);
  };
}

/** ارسال اعلان به همه‌ی پروسه‌ها (و در نتیجه همه‌ی مرورگرهای باز کاربر) */
export async function publish(userId, notification) {
  // pool جدا و کوچک: برای pg_notify لازم نیست از Prisma رد بشیم (Prisma ستون void رو نمی‌خونه)
  state.pool ??= new Pool({ connectionString: connectionString(), max: 1, idleTimeoutMillis: 10_000 });
  // محدودیت payload در Postgres هشت‌هزار بایته؛ اعلان‌ها خیلی کوچک‌ترن
  await state.pool.query("SELECT pg_notify($1, $2)", [CHANNEL, JSON.stringify({ userId, notification })]);
}
