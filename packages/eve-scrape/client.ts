import { Inngest, slugify } from "inngest";

import { env } from "./env";

// Create a client to send and receive events
export const client = new Inngest({
  id: slugify("jitaspace"),
  eventKey: env.INNGEST_EVENT_KEY,
  // v4 defaults to "cloud" mode (v3 defaulted to dev). Opt into dev mode when
  // not in production so the SDK talks to the local `inngest dev` server;
  // production (Vercel) uses cloud mode with INNGEST_SIGNING_KEY. Set the
  // INNGEST_DEV env var to override.
  isDev: process.env.NODE_ENV !== "production",
  // Checkpointing is enabled by default in v4. These functions run on Vercel
  // (serverless), so cap the per-request runtime below the platform function
  // timeout — see `maxDuration` in apps/web/app/api/inngest/route.ts — so that
  // steps checkpoint before the request is forcefully terminated. Keep this at
  // ~60-80% of that timeout.
  checkpointing: { maxRuntime: "240s" },
});
