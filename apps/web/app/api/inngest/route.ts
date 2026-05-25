import { serve } from "inngest/next";

import { client, functions } from "@jitaspace/eve-scrape";

// Prevent Next.js from calling this handler at build time; it imports
// @jitaspace/kv which connects to Redis via top-level await on module load.
export const dynamic = "force-dynamic";

export const { GET, POST, PUT } = serve({ client, functions });
