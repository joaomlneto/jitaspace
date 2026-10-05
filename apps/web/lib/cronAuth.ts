import { createHash, timingSafeEqual } from "node:crypto";

import { env } from "~/env";

/**
 * Whether the request carries `Authorization: Bearer <CRON_SECRET>`, as the
 * background jobs send it to the `/api/revalidate/*` routes.
 *
 * Both sides are hashed before comparing so `timingSafeEqual` sees two
 * equal-length buffers and the comparison time does not reveal the secret's
 * length. An unset or short secret authorizes nothing: without that guard, a
 * deployment running with `SKIP_ENV_VALIDATION` would accept
 * `Bearer undefined`.
 */
export function isCronAuthorized(request: Request): boolean {
  const secret = env.CRON_SECRET;
  if (!secret || secret.length < 16) return false;
  const header = request.headers.get("authorization");
  if (header === null) return false;
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(header), digest(`Bearer ${secret}`));
}
