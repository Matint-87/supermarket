// آپلود/حذف عکس پروفایل کاربر. multipart/form-data ست پس از readJson معمول (lib/api.js) استفاده نمی‌کنیم.
import { ApiError, handler, ok } from "@/lib/api";
import { requireApiUser, toPublicUser } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { ALLOWED_IMAGE_TYPES, deleteImage, saveImage } from "@/lib/storage";

const MAX_BYTES = 3 * 1024 * 1024; // ۳ مگابایت

// پاک‌کردن عکس قبلی (Blob یا فایل محلی) توی lib/storage.js انجام می‌شه؛ فقط آدرس‌های خودمون پاک می‌شن
const deleteOldAvatar = (url) => deleteImage(url, "avatars");

export const POST = handler(async (request) => {
  const user = await requireApiUser();
  await rateLimit(`avatar:${user.id}`, 20, 600, "تعداد درخواست‌های تغییر عکس پروفایل زیاد بوده؛ کمی بعد تلاش کنید");

  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    throw new ApiError(415, "درخواست نامعتبر است");
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    throw new ApiError(400, "فایل ارسالی خوانده نشد");
  }

  const file = form.get("avatar");
  if (!(file instanceof File) || file.size === 0) {
    throw new ApiError(400, "فایلی انتخاب نشده است");
  }
  if (!ALLOWED_IMAGE_TYPES[file.type]) {
    throw new ApiError(400, "فقط عکس با فرمت JPG، PNG یا WebP قابل قبول است");
  }
  if (file.size > MAX_BYTES) {
    throw new ApiError(400, "حجم عکس نباید بیشتر از ۳ مگابایت باشد");
  }

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
