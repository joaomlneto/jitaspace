import { serve } from "inngest/next";

import { client, functions } from "@jitaspace/eve-scrape";

// Vercel serverless function timeout (seconds). Inngest v4 enables checkpointing
// by default and runs multiple steps per request; the client's
// `checkpointing.maxRuntime` (240s) must stay below this so steps checkpoint
// before the platform kills the request. Requires a Vercel plan that allows it.
export const maxDuration = 300;

export const { GET, POST, PUT } = serve({ client, functions });
