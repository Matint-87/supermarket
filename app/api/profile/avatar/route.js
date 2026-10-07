// آپلود/حذف عکس پروفایل کاربر. multipart/form-data ست پس از readJson معمول (lib/api.js) استفاده نمی‌کنیم.
import { handler, ok } from "@/lib/api";
import { requireApiUser, toPublicUser } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { deleteImage, readImageUpload, saveImage } from "@/lib/storage";

const MAX_BYTES = 3 * 1024 * 1024; // ۳ مگابایت

// پاک‌کردن عکس قبلی (Blob یا فایل محلی) توی lib/storage.js انجام می‌شه؛ فقط آدرس‌های خودمون پاک می‌شن
const deleteOldAvatar = (url) => deleteImage(url, "avatars");

export const POST = handler(async (request) => {
  const user = await requireApiUser();
  await rateLimit(`avatar:${user.id}`, 20, 600, "تعداد درخواست‌های تغییر عکس پروفایل زیاد بوده؛ کمی بعد تلاش کنید");

  // بررسی Content-Length، نوع و حجم؛ سپس در saveImage محتوای واقعی عکس راستی‌آزمایی و دوباره‌سازی می‌شه
  const file = await readImageUpload(request, { field: "avatar", maxBytes: MAX_BYTES });

  const avatarUrl = await saveImage({ folder: "avatars", file });
  const previousAvatarUrl = user.avatarUrl;

  const updated = await prisma.user.update({ where: { id: user.id }, data: { avatarUrl } });
  await deleteOldAvatar(previousAvatarUrl);

  return ok({ user: toPublicUser(updated) });
});

export const DELETE = handler(async () => {
  const user = await requireApiUser();
  const updated = await prisma.user.update({ where: { id: user.id }, data: { avatarUrl: null } });
  await deleteOldAvatar(user.avatarUrl);
  // avatar روی وضعیت «کامل بودن حساب» اثری نداره، پس نیازی به رفرش createSession نیست
  return ok({ user: toPublicUser(updated) });
});
