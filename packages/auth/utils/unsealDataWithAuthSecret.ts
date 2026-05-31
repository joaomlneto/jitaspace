import Iron from "@hapi/iron";

export const unsealDataWithAuthSecret = async ({
  data,
  secret,
  ttlMs,
}: {
  data: string;
  secret: string;
  /** Optional time-to-live in milliseconds; Iron throws if the seal is older. */
  ttlMs?: number;
}): Promise<unknown> => {
  if (!secret) {
    throw new Error("Secret not set!");
  }

  // Iron enforces the TTL at unseal time using the timestamp embedded when the
  // value was sealed, throwing if it has expired.
  const options = ttlMs ? { ...Iron.defaults, ttl: ttlMs } : Iron.defaults;
  const result: unknown = await Iron.unseal(data, secret, options);
  return result;
};
