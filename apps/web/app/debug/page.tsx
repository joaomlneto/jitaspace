import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import type { PageProps } from "./page.client";
import { env } from "~/env";
import { prisma } from "~/lib/db";
import DebugPage from "./page.client";

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

  const props: PageProps = {
    database: dbStats,
    queues: queuesStatus,
    vars: {
      NODE_ENV: env.NODE_ENV,
      NEXTAUTH_SECRET: env.NEXTAUTH_SECRET,
      DATABASE_URL: env.DATABASE_URL,
      REDIS_URL: env.REDIS_URL,
      EVE_CLIENT_ID: env.EVE_CLIENT_ID,
      EVE_CLIENT_SECRET: env.EVE_CLIENT_SECRET,
      INNGEST_SIGNING_KEY: env.INNGEST_SIGNING_KEY,
      CRON_SECRET: env.CRON_SECRET,
      SKIP_BUILD_STATIC_GENERATION: env.SKIP_BUILD_STATIC_GENERATION,
      NEXT_PUBLIC_UMAMI_WEBSITE_ID: env.NEXT_PUBLIC_UMAMI_WEBSITE_ID,
      NEXT_PUBLIC_GOOGLE_TAG_ID: env.NEXT_PUBLIC_GOOGLE_TAG_ID,
      NEXT_PUBLIC_DISCORD_INVITE_LINK: env.NEXT_PUBLIC_DISCORD_INVITE_LINK,
    },
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
