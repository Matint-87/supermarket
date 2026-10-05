import { handler, ok, readJson } from "@/lib/api";
import { prisma } from "@/lib/db";
import { finalPriceOf } from "@/lib/product-constants";
import { shippingQuoteSchema } from "@/lib/schemas";
import { quoteShipping } from "@/lib/shipping-quote";

/**
 * عمومی: روش‌های ارسال فعال + هزینه و زمان تحویل برای یک شهر و یک سبد.
 * (فقط برای نمایش توی سبد؛ هزینه‌ی واقعی موقع ثبت سفارش دوباره سمت سرور حساب می‌شه.)
 */
export const POST = handler(async (request) => {
  const { province, city, items } = shippingQuoteSchema.parse(await readJson(request));

  const products = await prisma.product.findMany({
    where: { id: { in: items.map((i) => i.productId) }, isActive: true },
    select: { id: true, price: true, discountPercent: true },
  });
  const byId = new Map(products.map((p) => [p.id, p]));
  const itemsPayable = items.reduce((sum, i) => {
    const p = byId.get(i.productId);
    return p ? sum + finalPriceOf(p.price, p.discountPercent) * i.quantity : sum;
  }, 0);

  return ok(await quoteShipping({ province, city, itemsPayable }));
});
