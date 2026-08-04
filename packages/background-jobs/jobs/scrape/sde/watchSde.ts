import { latestSdeBuild } from "@jitaspace/sde-utils";

import { defineJob } from "../../../core";
import { getRedis } from "../../../kv";

export interface WatchSdeEventPayload {
  data: Record<string, never>;
}

// Redis key holding the SDE build number we last kicked an ingest for.
const LAST_SEEN_KEY = "sde:build-number-ingested";

/**
 * Hourly watcher that triggers `ingest-sde-all` when CCP publishes a new SDE.
 *
 * It reads the published build number (cheap — no ~97 MB download) and compares
 * to the value stored in Redis. On a change it fires `ingest-sde-all`
 * (fire-and-forget — it runs on its own roomy machine) and records the new value,
 * so the next poll is a no-op until CCP republishes.
 *
 * The stored build number is the entire state and is loss-tolerant: losing it
 * just kicks one redundant — and idempotent — ingest. And because
 * `ingest-sde-all` is a full diff, a missed trigger self-corrects on the next
 * publish. (The same applies to the key rename off the old `Last-Modified`
 * value: the first poll after deploying that change ingests once, then settles.)
 *
 * The build number is CCP's own identifier for an SDE revision, so it changes
 * exactly when the data does — a republished-but-identical archive moves
 * `Last-Modified` and the `ETag`, but not this.
 */
export const watchSde = defineJob<WatchSdeEventPayload["data"]>({
  id: "watch-sde",
  name: "Watch for new SDE releases",
  description:
    "Hourly check of the published SDE build number; triggers ingest-sde-all when it changes.",
  trigger: { type: "cron", cron: "TZ=UTC 0 * * * *" },
  singleton: true,
  // No per-task machine: inherit the project default (small-1x). The handler is
  // trivial (one HEAD + one Redis op), but every worker loads the full task
  // bundle, whose baseline RSS exceeds micro's 0.25 GB — micro OOM-killed this
  // job. See the `machine` default in trigger.config.ts.
  handler: async (ctx) => {
    const { buildNumber } = await latestSdeBuild();
    const redis = await getRedis();

    if ((await redis.get(LAST_SEEN_KEY)) === String(buildNumber)) {
      ctx.logger.info(
        `SDE unchanged (build ${buildNumber}); not re-ingesting.`,
      );
      return { changed: false, buildNumber };
    }

    await ctx.send("ingest-sde-all", {});
    await redis.set(LAST_SEEN_KEY, String(buildNumber));
    ctx.logger.info(
      `New SDE (build ${buildNumber}); triggered ingest-sde-all.`,
    );
    return { changed: true, buildNumber };
  },
});
