import { handler, ok, readJson } from "@/lib/api";
import { logActivity } from "@/lib/activity-log";
import { requireApiAdmin } from "@/lib/dal";
import { PALETTE_BY_ID } from "@/lib/palettes";
import { sitePaletteSchema } from "@/lib/schemas";
import { getSitePalette, saveSitePalette } from "@/lib/settings";

export const dynamic = "force-dynamic";

export const GET = handler(async () => {
  await requireApiAdmin();
  return ok({ palette: await getSitePalette() });
});

// انتخاب پالت رنگی سایت توسط ادمین (روی همه‌ی بازدیدکننده‌ها اثر می‌ذاره)
export const PUT = handler(async (request) => {
  const admin = await requireApiAdmin();
  const { palette } = sitePaletteSchema.parse(await readJson(request));
  await saveSitePalette(palette);
  await logActivity(admin, {
    action: "UPDATE",
    entity: "SITE_PALETTE",
    entityId: palette,
    summary: `پالت رنگی سایت: ${PALETTE_BY_ID[palette].label}`,
  });
  return ok({ palette: await getSitePalette() });
});
