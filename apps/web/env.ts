import { z } from "zod";

/**
 * Specify your server-side environment variables schema here. This way you can ensure the app isn't
 * built with invalid env vars.
 */
const server = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]),

  NEXTAUTH_SECRET: z.string().min(1),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string(),

  /**
   * Change-history database (the eve-builds CockroachDB, `history` schema),
   * read by @jitaspace/db-history. Optional so the rest of the app builds
   * without it; the /history pages need it set to return data.
   */
  HISTORY_DATABASE_URL: z.string().url().optional(),
  HISTORY_DATABASE_SCHEMA: z.string().optional(),

  EVE_CLIENT_ID: z.string(),
  EVE_CLIENT_SECRET: z.string(),

  INNGEST_SIGNING_KEY: z.string().min(1),
  /**
   * Whether the Inngest serve route (`/api/inngest`) is live. Inngest has been
   * superseded by Trigger.dev; defaults off so the same jobs don't run on both
   * platforms. Set to "true" to re-enable Inngest (rollback).
   */
  INNGEST_ENABLED: z.enum(["true", "false"]).optional(),
  /**
   * Overrides the Inngest REST API base URL used by the status endpoint
   * (defaults to https://api.inngest.com in production and the local
   * `inngest dev` server otherwise).
   */
  INNGEST_BASE_URL: z.string().url().optional(),
  /**
   * Trigger.dev secret key (tr_prod_… / tr_dev_…) used by the status
   * dashboard's runs.list calls. Optional: the dashboard degrades to an
   * "unavailable" state when unset.
   */
  TRIGGER_SECRET_KEY: z.string().optional(),
  /** Overrides the Trigger.dev API base URL (defaults to https://api.trigger.dev). */
  TRIGGER_API_URL: z.string().url().optional(),
  CRON_SECRET: z.string().min(16),

  SKIP_BUILD_STATIC_GENERATION: z.string(),
});

/**
 * Specify your client-side environment variables schema here. This way you can ensure the app isn't
 * built with invalid env vars. To expose them to the client, prefix them with `NEXT_PUBLIC_`.
 */
const client = z.object({
  NEXT_PUBLIC_UMAMI_WEBSITE_ID:
    process.env.NODE_ENV === "production"
      ? z.string().min(1)
      : z.string().min(1).optional(),
  NEXT_PUBLIC_GOOGLE_TAG_ID:
    process.env.NODE_ENV === "production"
      ? z.string().min(1)
      : z.string().min(1).optional(),

  NEXT_PUBLIC_DISCORD_INVITE_LINK: z.string().url(),
  NEXT_PUBLIC_MODIFIED_DATE: z.string().optional(),
});

/**
 * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
 * middlewares) or client-side, so we need to destruct manually.
 */
const processEnv = {
  NODE_ENV: process.env.NODE_ENV,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  DATABASE_URL: process.env.DATABASE_URL,
  REDIS_URL: process.env.REDIS_URL,
  HISTORY_DATABASE_URL: process.env.HISTORY_DATABASE_URL,
  HISTORY_DATABASE_SCHEMA: process.env.HISTORY_DATABASE_SCHEMA,
  EVE_CLIENT_ID: process.env.EVE_CLIENT_ID,
  EVE_CLIENT_SECRET: process.env.EVE_CLIENT_SECRET,
  INNGEST_SIGNING_KEY: process.env.INNGEST_SIGNING_KEY,
  INNGEST_ENABLED: process.env.INNGEST_ENABLED,
  INNGEST_BASE_URL: process.env.INNGEST_BASE_URL,
  TRIGGER_SECRET_KEY: process.env.TRIGGER_SECRET_KEY,
  TRIGGER_API_URL: process.env.TRIGGER_API_URL,
  CRON_SECRET: process.env.CRON_SECRET,
  SKIP_BUILD_STATIC_GENERATION: process.env.SKIP_BUILD_STATIC_GENERATION,
  NEXT_PUBLIC_UMAMI_WEBSITE_ID: process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID,
  NEXT_PUBLIC_GOOGLE_TAG_ID: process.env.NEXT_PUBLIC_GOOGLE_TAG_ID,
  NEXT_PUBLIC_DISCORD_INVITE_LINK: process.env.NEXT_PUBLIC_DISCORD_INVITE_LINK,
  NEXT_PUBLIC_MODIFIED_DATE: process.env.NEXT_PUBLIC_MODIFIED_DATE,
};

// Don't touch the part below
// --------------------------

const merged = server.merge(client);

let env = process.env as unknown as z.infer<typeof merged>;

if (!!process.env.SKIP_ENV_VALIDATION === false) {
  const isServer = typeof window === "undefined";

  const parsed = isServer
    ? merged.safeParse(processEnv) // on server we can validate all env vars
    : client.safeParse(processEnv); // on the client we can only validate the ones that are exposed

  if (parsed.success === false) {
    console.error(
      "❌ Invalid environment variables:",
      parsed.error.flatten().fieldErrors,
    );
    throw new Error("Invalid environment variables");
  }

  env = new Proxy(parsed.data, {
    get(target, prop) {
      if (typeof prop !== "string") return undefined;
      // Throw a descriptive error if a server-side env var is accessed on the client
      // Otherwise it would just be returning `undefined` and be annoying to debug
      if (
        !isServer &&
        !prop.startsWith("NEXT_PUBLIC_") &&
        !["NODE_ENV"].includes(prop)
      )
        throw new Error(
          process.env.NODE_ENV === "production"
            ? "❌ Attempted to access a server-side environment variable on the client"
            : `❌ Attempted to access server-side environment variable '${prop}' on the client`,
        );
      return target[prop as keyof typeof target];
    },
  }) as unknown as z.infer<typeof merged>;
}

export { env };
