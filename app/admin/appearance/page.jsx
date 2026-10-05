import SitePaletteAdmin from "@/components/admin/SitePaletteAdmin";
import { getSitePalette } from "@/lib/settings";

export const metadata = { title: "پالت رنگی سایت | پنل مدیریت" };
export const dynamic = "force-dynamic";

export default async function AdminAppearancePage() {
  const palette = await getSitePalette();
  return <SitePaletteAdmin initial={palette} />;
}
