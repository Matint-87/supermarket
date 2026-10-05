// آپلود عکس محصول (فقط ادمین). multipart/form-data ست پس از readJson معمول (lib/api.js) استفاده نمی‌کنیم.
// این route فقط عکس رو ذخیره می‌کنه و آدرسش رو برمی‌گردونه؛ ثبت/ویرایش خودِ محصول با imageUrl از همین آدرس صدا زده می‌شه.
import { ApiError, handler, ok } from "@/lib/api";
import { requireApiAdmin } from "@/lib/dal";
import { ALLOWED_IMAGE_TYPES, MAX_UPLOAD_BYTES, saveImage } from "@/lib/storage";

export const POST = handler(async (request) => {
  await requireApiAdmin();

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

  const file = form.get("image");
  if (!(file instanceof File) || file.size === 0) {
    throw new ApiError(400, "فایلی انتخاب نشده است");
  }
  if (!ALLOWED_IMAGE_TYPES[file.type]) {
    throw new ApiError(400, "فقط عکس با فرمت JPG، PNG یا WebP قابل قبول است");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new ApiError(400, "حجم عکس نباید بیشتر از ۴ مگابایت باشد");
  }

  // عکس کوچیک و توی دیتابیس ذخیره می‌شه؛ آدرس برگشتی /api/images/<id> هست (lib/storage.js)
  const imageUrl = await saveImage({ folder: "products", file });
  return ok({ imageUrl }, { status: 201 });
});
