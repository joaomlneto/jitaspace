import { latestSdeLastModified } from "@jitaspace/sde-utils";

import { defineJob } from "../../../core";
import { getRedis } from "../../../kv";

export interface WatchSdeEventPayload {
  data: Record<string, never>;
}

// Redis key holding the SDE archive `Last-Modified` we last kicked an ingest for.
const LAST_SEEN_KEY = "sde:last-modified-ingested";

/**
 * Hourly watcher that triggers `ingest-sde-all` when CCP publishes a new SDE.
 *
 * It `HEAD`s the archive for its `Last-Modified` (cheap — no ~97 MB download) and
 * compares to the value stored in Redis. On a change it fires `ingest-sde-all`
 * (fire-and-forget — it runs on its own roomy machine) and records the new value,
 * so the next poll is a no-op until CCP republishes.
 *
 * The stored timestamp is the entire state and is loss-tolerant: losing it just
 * kicks one redundant — and idempotent — ingest. And because `ingest-sde-all` is
 * a full diff, a missed trigger self-corrects on the next publish.
 *
 * Detection uses `Last-Modified`, NOT `SDE_CHECKSUM_URL` (which still points at
 * the old S3 export — a different artifact than the developers.eveonline.com
 * archive we download). Switch to comparing the `ETag` if it ever proves flaky.
 */
export const watchSde = defineJob<WatchSdeEventPayload["data"]>({
  id: "watch-sde",
  name: "Watch for new SDE releases",
  description:
    "Hourly HEAD on the SDE archive; triggers ingest-sde-all when its Last-Modified changes.",
  trigger: { type: "cron", cron: "TZ=UTC 0 * * * *" },
  singleton: true,
  // No per-task machine: inherit the project default (small-1x). The handler is
  // trivial (one HEAD + one Redis op), but every worker loads the full task
  // bundle, whose baseline RSS exceeds micro's 0.25 GB — micro OOM-killed this
  // job. See the `machine` default in trigger.config.ts.
  handler: async (ctx) => {
    const lastModified = (await latestSdeLastModified()).toISOString();
    const redis = await getRedis();

    if ((await redis.get(LAST_SEEN_KEY)) === lastModified) {
      ctx.logger.info(`SDE unchanged (${lastModified}); not re-ingesting.`);
      return { changed: false, lastModified };
    }

    await ctx.send("ingest-sde-all", {});
    await redis.set(LAST_SEEN_KEY, lastModified);
    ctx.logger.info(`New SDE (${lastModified}); triggered ingest-sde-all.`);
    return { changed: true, lastModified };
  },
});
