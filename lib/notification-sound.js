// صدای اعلان‌ها — بدون هیچ فایل صوتی و بدون دانلود.
// صدا همون لحظه با Web Audio API (که توی همه‌ی مرورگرهای موبایل و لپ‌تاپ هست) از روی چند «نُت» ساخته می‌شه.
// پوش‌های سیستمی (وقتی سایت بسته‌ست) هم از صدای پیش‌فرض خودِ گوشی/سیستم‌عامل استفاده می‌کنن (silent: false توی sw.js).

/** هر صدا = فهرستی از نُت‌ها: فرکانس (هرتز)، شروع و مدت (ثانیه)، بلندی */
const TUNES = {
  // اعلان معمولی: دو نُت ملایم «دینگ‌دینگ»
  notify: [
    { f: 880, at: 0, dur: 0.45, gain: 0.5 },
    { f: 1320, at: 0.14, dur: 0.6, gain: 0.45 },
  ],
  // سفارش جدید (ادمین): سه نُت صعودیِ واضح‌تر
  order: [
    { f: 784, at: 0, dur: 0.5, gain: 0.6 },
    { f: 988, at: 0.16, dur: 0.5, gain: 0.6 },
    { f: 1319, at: 0.32, dur: 0.9, gain: 0.65 },
  ],
};

/** یک نُت زنگوله‌ای: موج سینوسی + هارمونیک دوم، با شروع نرم و محو شدن نمایی (کلیک نمی‌ده) */
function addNote(data, sampleRate, { f, at, dur, gain }) {
  const start = Math.floor(at * sampleRate);
  const length = Math.floor(dur * sampleRate);
  const attack = Math.floor(0.008 * sampleRate);
  for (let i = 0; i < length && start + i < data.length; i++) {
    const t = i / sampleRate;
    const env = Math.min(1, i / attack) * Math.exp((-5 * i) / length);
    const wave = Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(2 * Math.PI * f * 2 * t);
    data[start + i] += wave * env * gain * 0.35;
  }
}

/** همه‌ی صداها رو داخل AudioBuffer می‌سازه: { notify, order } */
export function buildSounds(ctx) {
  const out = {};
  for (const [name, notes] of Object.entries(TUNES)) {
    const total = Math.max(...notes.map((n) => n.at + n.dur)) + 0.05;
    const buffer = ctx.createBuffer(1, Math.ceil(total * ctx.sampleRate), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (const note of notes) addNote(data, ctx.sampleRate, note);
    out[name] = buffer;
  }
  return out;
}

/** لرزش گوشی؛ برای وقتی که صدا هنوز قفله یا مرورگر Web Audio نداره */
export function vibrate(important = false) {
  try {
    navigator.vibrate?.(important ? [200, 100, 200, 100, 200] : [150, 80, 150]);
  } catch {}
}
