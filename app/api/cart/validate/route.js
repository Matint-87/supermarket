import { z } from "zod";
import { handler, ok, readJson } from "@/lib/api";
import { toPublicProduct } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { MAX_CART_LINES } from "@/lib/product-constants";
import { uuidSchema } from "@/lib/schemas";

const bodySchema = z.object({
  ids: z.array(uuidSchema, { error: "درخواست نامعتبر است" }).max(MAX_CART_LINES),
});

/**
 * عمومی: قیمت و موجودی «فعلی» محصولات داخل سبد رو برمی‌گردونه
 * تا کلاینت سبد ذخیره‌شده توی localStorage رو با دیتابیس هماهنگ کنه.
 */
export const POST = handler(async (request) => {
  const { ids } = bodySchema.parse(await readJson(request));
  if (ids.length === 0) return ok({ products: [] });

  const rows = await prisma.product.findMany({ where: { id: { in: ids } } });
  return ok({ products: rows.map(toPublicProduct) });
});
