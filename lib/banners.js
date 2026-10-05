// خوندن بنرهای صفحه‌ی اصلی (برای رندر سمت سرور). اگه دیتابیس در دسترس نباشه، خالی برمی‌گردونه
// تا صفحه‌ی اصلی خراب نشه و هیروی پیش‌فرض نمایش داده بشه.
import "server-only";
import { toPublicBanner } from "@/lib/dal";
import { prisma } from "@/lib/db";

const ORDER = [{ sortOrder: "asc" }, { createdAt: "asc" }];

export async function getActiveBanners() {
  try {
    const rows = await prisma.banner.findMany({ where: { isActive: true }, orderBy: ORDER });
    return rows.map(toPublicBanner);
  } catch (err) {
    console.error("[banners]", err);
    return [];
  }
}

/** همه‌ی بنرها (فعال و غیرفعال) برای پنل مدیریت */
export async function getAllBanners() {
  const rows = await prisma.banner.findMany({ orderBy: ORDER });
  return rows.map(toPublicBanner);
}
