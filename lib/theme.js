// تنظیم ظاهر سایت: «سیستم» (پیش‌فرض) / «روشن» / «تاریک».
// انتخاب کاربر توی localStorage می‌مونه و قبل از اولین رندر (اسکریپت داخل <head>) روی <html> اعمال می‌شه
// تا موقع باز شدن صفحه، سفید/تیره‌ی اشتباه پرش نکنه.

export const THEME_KEY = "theme";
export const THEMES = ["system", "light", "dark"];
export const DEFAULT_THEME = "system";

/** اسکریپتِ کوچکِ inline که در <head> اجرا می‌شه (قبل از نمایش صفحه) */
export const THEME_INIT_SCRIPT = `(function(){try{var p=localStorage.getItem("${THEME_KEY}");if(p!=="light"&&p!=="dark")p="system";var d=p==="dark"||(p==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;r.classList.toggle("dark",d);r.style.colorScheme=d?"dark":"light";}catch(e){}})();`;

export function readStoredTheme() {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return THEMES.includes(v) ? v : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function resolveTheme(pref) {
  if (pref === "dark") return "dark";
  if (pref === "light") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(pref) {
  const resolved = resolveTheme(pref);
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
  return resolved;
}
