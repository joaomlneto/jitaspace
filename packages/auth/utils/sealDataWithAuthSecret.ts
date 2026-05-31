import Iron from "@hapi/iron";

export const sealDataWithAuthSecret = async ({
  data,
  secret,
  ttlMs,
}: {
  data: unknown;
  secret: string;
  /** Optional time-to-live in milliseconds, enforced at unseal time. */
  ttlMs?: number;
}) => {
  if (!secret) {
    throw new Error("Secret not set!");
  }

  const options = ttlMs ? { ...Iron.defaults, ttl: ttlMs } : Iron.defaults;
  return await Iron.seal(data, secret, options);
};
