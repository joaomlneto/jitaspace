/**
 * The connection pool size to hand `createPrismaClient`, from the
 * `DATABASE_POOL_MAX` environment variable.
 *
 * Returns `undefined` for anything that is not a positive whole number, which
 * leaves the client on its default. The value arrives as a number when the
 * environment was validated and as the raw string when it was not
 * (`SKIP_ENV_VALIDATION`), so both are accepted.
 */
export function poolSizeFromEnv(
  value: number | string | undefined,
): number | undefined {
  if (value === undefined || value === "") return undefined;
  const size = Number(value);
  return Number.isInteger(size) && size > 0 ? size : undefined;
}
