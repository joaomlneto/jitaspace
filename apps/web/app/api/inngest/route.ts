import { serve } from "inngest/next";

import { client, functions } from "@jitaspace/eve-scrape";

import { env } from "~/env";

// Vercel serverless function timeout (seconds). Inngest v4 enables checkpointing
// by default and runs multiple steps per request; the client's
// `checkpointing.maxRuntime` (240s) must stay below this so steps checkpoint
// before the platform kills the request. Requires a Vercel plan that allows it.
export const maxDuration = 300;

// Inngest is being retired in favour of Trigger.dev
// (@jitaspace/background-jobs-triggerdev). The handler is kept for rollback but
// disabled by default: with no live endpoint, Inngest Cloud runs nothing
// (including the cron), so the same jobs don't run on both platforms. Set
// INNGEST_ENABLED="true" to re-enable Inngest serving.
const inngestEnabled = env.INNGEST_ENABLED === "true";

const handlers = serve({ client, functions });

const disabled = () =>
  new Response(
    "Inngest serving is disabled; background jobs run on Trigger.dev.",
    { status: 404 },
  );

export const GET = inngestEnabled ? handlers.GET : disabled;
export const POST = inngestEnabled ? handlers.POST : disabled;
export const PUT = inngestEnabled ? handlers.PUT : disabled;
