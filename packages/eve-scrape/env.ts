import { z } from "zod";

/**
 * Inngest-adapter env. The job logic's own env (DATABASE_URL, REDIS_URL,
 * DISCORD_*) lives in `@jitaspace/background-jobs`; this package only needs the
 * Inngest keys for the client/serve handler.
 */
const server = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).optional(),
  INNGEST_EVENT_KEY:
    process.env.NODE_ENV === "production"
      ? z.string().min(1)
      : z.string().min(1).optional(),
  INNGEST_SIGNING_KEY:
    process.env.NODE_ENV === "production"
      ? z.string().min(1)
      : z.string().min(1).optional(),
});

const processEnv = {
  NODE_ENV: process.env.NODE_ENV,
  INNGEST_EVENT_KEY: process.env.INNGEST_EVENT_KEY,
  INNGEST_SIGNING_KEY: process.env.INNGEST_SIGNING_KEY,
};

// Don't touch the part below
// --------------------------

let env = process.env as unknown as z.infer<typeof server>;

if (!!process.env.SKIP_ENV_VALIDATION === false) {
  const parsed = server.safeParse(processEnv);

  if (parsed.success === false) {
    console.error(
      "❌ Invalid environment variables:",
      parsed.error.flatten().fieldErrors,
    );
    throw new Error("Invalid environment variables");
  }

  env = parsed.data;
}

export { env };
