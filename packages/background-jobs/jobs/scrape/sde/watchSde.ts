import { latestSdeBuild } from "@jitaspace/sde-utils";

import { defineJob } from "../../../core";
import { coversSdeBuild, loadedSdeBuild } from "./sdeIngestState";

export interface WatchSdeEventPayload {
  data: Record<string, never>;
}

/**
 * Hourly watcher that triggers `ingest-sde-all` when CCP publishes a new SDE.
 *
 * It reads the published build number (cheap — no ~97 MB download) and compares
 * it to the build recorded in Redis. On a change it fires `ingest-sde-all`
 * (fire-and-forget — it runs on its own roomy machine), which records the new
 * build itself, so the next poll is a no-op until CCP republishes.
 *
 * The ingest claims that marker when it starts and stamps it complete only after
 * every step succeeded, so a run that dies partway does not leave the watcher
 * believing that build is loaded — `coversSdeBuild` retries it once the claim
 * goes stale — while an in-flight run still suppresses a duplicate trigger. The
 * marker is loss-tolerant either way: losing it kicks one redundant, idempotent
 * ingest, and because `ingest-sde-all` is a full diff, a missed trigger
 * self-corrects on the next publish.
 *
 * The build number is CCP's own identifier for an SDE revision, so it changes
 * exactly when the data does — a republished-but-identical archive moves
 * `Last-Modified` and the `ETag`, but not this.
 */
export const watchSde = defineJob<WatchSdeEventPayload["data"]>({
  id: "watch-sde",
  name: "Watch for new SDE releases",
  description:
    "Hourly check of the published SDE build number; triggers ingest-sde-all when it differs from the build last ingested.",
  trigger: { type: "cron", cron: "TZ=UTC 0 * * * *" },
  singleton: true,
  // No per-task machine: inherit the project default (small-1x). The handler is
  // trivial (one HEAD + one Redis read), but every worker loads the full task
  // bundle, whose baseline RSS exceeds micro's 0.25 GB — micro OOM-killed this
  // job. See the `machine` default in trigger.config.ts.
  handler: async (ctx) => {
    const { buildNumber } = await latestSdeBuild();
    const ingested = await loadedSdeBuild();

    if (coversSdeBuild(ingested, buildNumber)) {
      ctx.logger.info(
        `SDE unchanged (build ${buildNumber}); not re-ingesting.`,
      );
      return { changed: false, buildNumber };
    }

    await ctx.send("ingest-sde-all", {});
    ctx.logger.info(
      `New SDE (build ${buildNumber}); triggered ingest-sde-all.`,
    );
    return { changed: true, buildNumber };
  },
});
