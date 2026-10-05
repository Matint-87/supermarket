// پالت‌های رنگی سایت (قابل انتخاب از پنل مدیریت → «پالت رنگی سایت»).
// مقدارهای واقعی رنگ‌ها (روشن و تاریک) توی app/globals.css با data-palette روی <html> اعمال می‌شن؛
// اینجا فقط شناسه‌ها و رنگ‌های نمونه برای پیش‌نمایش هست. این فایل سمت کلاینت هم import می‌شه.

export const SITE_PALETTE_KEY = "site-palette";
export const DEFAULT_PALETTE = "default";

export const PALETTES = [
  {
    id: "default",
    label: "آبی و کِرِم (پیش‌فرض)",
    description: "پالت فعلی سایت",
    themeColor: { light: "#3368A0", dark: "#0d131c" },
    light: { bg: "#F2EFE7", card: "#FFFFFF", line: "#DCD7C8", text: "#1E293B", mute: "#C7C1AF", brand: "#3368A0", swatches: ["#3368A0", "#66A3BF", "#C8DFDB", "#F2EFE7"] },
    dark: { bg: "#0D131C", card: "#131B27", line: "#263247", text: "#E4E9F1", mute: "#36455D", brand: "#4D85AF", swatches: ["#0D131C", "#131B27", "#2E5F86", "#66A3BF"] },
  },
  {
    id: "sea",
    label: "سبز دریایی",
    description: "#659287 · #88BDA4 · #B1D3B9 · #E6F2DD",
    themeColor: { light: "#659287", dark: "#0f1715" },
    light: { bg: "#E6F2DD", card: "#FFFFFF", line: "#CDDCC6", text: "#2C3D36", mute: "#B8C9B2", brand: "#659287", swatches: ["#659287", "#88BDA4", "#B1D3B9", "#E6F2DD"] },
    dark: { bg: "#0F1715", card: "#16201D", line: "#2A3B36", text: "#E4ECE8", mute: "#3C524B", brand: "#77A896", swatches: ["#0F1715", "#16201D", "#35614F", "#88BDA4"] },
  },
  {
    id: "earth",
    label: "قهوه‌ای و کِرِم",
    description: "#FFF8F0 · #C08552 · #8C5A3C · #4B2E2B",
    themeColor: { light: "#8C5A3C", dark: "#1a1210" },
    light: { bg: "#FFF8F0", card: "#FFFFFF", line: "#EAD9C8", text: "#3D2F2A", mute: "#D6BFA8", brand: "#8C5A3C", swatches: ["#FFF8F0", "#C08552", "#8C5A3C", "#4B2E2B"] },
    dark: { bg: "#1A1210", card: "#231916", line: "#40302A", text: "#EADCCE", mute: "#5A443A", brand: "#C08552", swatches: ["#1A1210", "#231916", "#6B4A37", "#C08552"] },
  },
];

export const PALETTE_IDS = PALETTES.map((p) => p.id);
export const PALETTE_BY_ID = Object.fromEntries(PALETTES.map((p) => [p.id, p]));

/** هر مقدار نامعتبری (مثلاً پالت حذف‌شده) به پالت پیش‌فرض برمی‌گرده */
export function normalizePalette(id) {
  return PALETTE_IDS.includes(id) ? id : DEFAULT_PALETTE;
}
