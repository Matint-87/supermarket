import "server-only";
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

// پارامترهای scrypt (توصیه OWASP: N=2^17 حداقل برای امنیت بالا؛ اینجا 2^15 برای تعادل با سرعت VPS)
const N = 2 ** 15;
const R = 8;
const P = 1;
const KEYLEN = 64;
const MAXMEM = 128 * N * R * 2;

/** خروجی: scrypt$N$r$p$salt$hash (همه base64) */
export async function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password.normalize("NFKC"), salt, KEYLEN, {
    N,
    r: R,
    p: P,
    maxmem: MAXMEM,
  });
  return ["scrypt", N, R, P, salt.toString("base64"), hash.toString("base64")].join("$");
}

export async function verifyPassword(password, stored) {
  try {
    const [scheme, n, r, p, saltB64, hashB64] = String(stored).split("$");
    if (scheme !== "scrypt") return false;
    const salt = Buffer.from(saltB64, "base64");
    const expected = Buffer.from(hashB64, "base64");
    const actual = await scryptAsync(password.normalize("NFKC"), salt, expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
      maxmem: 128 * Number(n) * Number(r) * 2,
    });
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

let dummyHashPromise;
/** برای شماره‌هایی که کاربر ندارن هم یه هش می‌سنجیم تا زمان پاسخ لو ندهد کاربر وجود داره یا نه */
export async function burnPasswordCheck(password) {
  dummyHashPromise ??= hashPassword("dummy-password-for-timing");
  await verifyPassword(password, await dummyHashPromise);
}
