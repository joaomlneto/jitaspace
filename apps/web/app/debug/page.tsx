import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import type { PageProps } from "./page.client";
import { env } from "~/env";
import { prisma } from "~/lib/db";
import DebugPage from "./page.client";
import { redactEnvValue } from "./redact";

export async function DebugPageContent() {
  if (env.NODE_ENV === "production") {
    notFound();
  }
  await connection();

  // Dynamic import: ~/lib/kv connects to Redis at module load time via
  // top-level await, so it must not be statically imported at the module level
  // or Next.js will attempt the connection during build-time config collection.
  const { kv } = await import("~/lib/kv");
  const queues = Object.values(kv.queues);

  const queuesStatus = await Promise.all(
    queues.map(async (queue) => ({
      paused: (await queue.isPaused()) ? "Yes" : "No",
      size: await queue.count(),
      active: await queue.getActiveCount(),
      completed: await queue.getCompletedCount(),
      failed: await queue.getFailedCount(),
      delayed: await queue.getDelayedCount(),
      waiting: await queue.getWaitingCount(),
      workers: (await queue.getWorkers()).length,
      name: queue.name,
    })),
  );

  const dbModels = Object.keys(prisma).filter(
    (key) =>
      !key.startsWith("_") &&
      !key.startsWith("$") &&
      ![
        "constructor",
        "$connect",
        "$disconnect",
        "executeRaw",
        "queryRaw",
        "transaction",
      ].includes(key),
  );
  dbModels.sort((a, b) => a.localeCompare(b));

  const dbStats = await Promise.all(
    dbModels.map(async (name) => ({
      name,
      count: await (
        prisma[name as keyof typeof prisma] as { count: () => Promise<number> }
      ).count(),
    })),
  );

  // Plaintext values, server-side only. This object must never be handed to a
  // Client Component: props crossing that boundary are serialized into the RSC
  // flight payload, so they reach the browser whether or not anything renders
  // them. Redaction therefore happens here rather than in page.client.tsx —
  // masking on the client would still put the secrets on the wire (and could
  // not read them anyway, since ~/env throws on server-var access there).
  const rawVars: Record<string, string | undefined> = {
    NODE_ENV: env.NODE_ENV,
    NEXTAUTH_SECRET: env.NEXTAUTH_SECRET,
    DATABASE_URL: env.DATABASE_URL,
    REDIS_URL: env.REDIS_URL,
    HISTORY_DATABASE_URL: env.HISTORY_DATABASE_URL,
    HISTORY_DATABASE_SCHEMA: env.HISTORY_DATABASE_SCHEMA,
    EVE_CLIENT_ID: env.EVE_CLIENT_ID,
    EVE_CLIENT_SECRET: env.EVE_CLIENT_SECRET,
    TRIGGER_SECRET_KEY: env.TRIGGER_SECRET_KEY,
    TRIGGER_API_URL: env.TRIGGER_API_URL,
    CRON_SECRET: env.CRON_SECRET,
    AUTH_TRUSTED_ORIGINS: env.AUTH_TRUSTED_ORIGINS,
    VERCEL_URL: env.VERCEL_URL,
    VERCEL_BRANCH_URL: env.VERCEL_BRANCH_URL,
    VERCEL_PROJECT_PRODUCTION_URL: env.VERCEL_PROJECT_PRODUCTION_URL,
    SKIP_BUILD_STATIC_GENERATION: env.SKIP_BUILD_STATIC_GENERATION,
    NEXT_PUBLIC_UMAMI_WEBSITE_ID: env.NEXT_PUBLIC_UMAMI_WEBSITE_ID,
    NEXT_PUBLIC_GOOGLE_TAG_ID: env.NEXT_PUBLIC_GOOGLE_TAG_ID,
    NEXT_PUBLIC_DISCORD_INVITE_LINK: env.NEXT_PUBLIC_DISCORD_INVITE_LINK,
    NEXT_PUBLIC_SITE_URL: env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_MODIFIED_DATE: env.NEXT_PUBLIC_MODIFIED_DATE,
    NEXT_PUBLIC_POSTHOG_HOST: env.NEXT_PUBLIC_POSTHOG_HOST,
    NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN,
  };

  const props: PageProps = {
    database: dbStats,
    queues: queuesStatus,
    // Single choke point: every entry is redacted on the way out, so a var
    // added above cannot bypass `redactEnvValue()`.
    vars: Object.fromEntries(
      Object.entries(rawVars).map(([key, value]) => [
        key,
        redactEnvValue(key, value),
      ]),
    ),
  };

  return <DebugPage {...props} />;
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <DebugPageContent />
    </Suspense>
  );
}
