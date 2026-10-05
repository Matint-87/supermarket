// ثبت لاگ کارهای ادمین‌ها. هیچ‌وقت خطا پرتاب نمی‌کنه: اگه ثبت لاگ به هر دلیلی شکست بخوره،
// کار اصلی ادمین (مثلاً ذخیره‌ی محصول) نباید خراب بشه.
import "server-only";
import { getClientIp } from "@/lib/api";
import { prisma } from "@/lib/db";

/**
 * @param {{id: string, firstName?: string|null, lastName?: string|null, phone: string}} admin
 * @param {{action: "CREATE"|"UPDATE"|"DELETE"|"STATUS", entity: string, entityId?: string|null, summary: string}} entry
 */
export async function logActivity(admin, { action, entity, entityId = null, summary }) {
  try {
    const adminName = [admin.firstName, admin.lastName].filter(Boolean).join(" ") || admin.phone;
    await prisma.activityLog.create({
      data: {
        adminId: admin.id,
        adminName,
        action,
        entity,
        entityId,
        summary: String(summary).slice(0, 300),
        ip: await getClientIp(),
      },
    });
  } catch (err) {
    console.error("[activity-log]", err);
  }
}
