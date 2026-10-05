import { defineJob } from "../../../core";
import { env } from "../../../env";
import { postWebAppRevalidation } from "../../../helpers/postWebAppRevalidation";

export interface RevalidateAllianceCacheEventPayload {
  data: {
    allianceIds: number[];
  };
}

/**
 * Tells the web app which alliances `esi-update-alliances` changed, so it
 * evicts their cached `/alliance/[allianceId]` pages (regenerated on the next
 * request) and marks the `/alliances` list stale.
 *
 * A job of its own, not a step in the hourly update, for the same reason as
 * `revalidate-sde-cache`: a failed call is retried on its own. Retrying the
 * update instead would find nothing left to change, and the eviction would be
 * lost.
 */
export const revalidateAllianceCache = defineJob<
  RevalidateAllianceCacheEventPayload["data"]
>({
  id: "revalidate-alliance-cache",
  name: "Revalidate the web app's alliance pages",
  description:
    "Evict the web app's cached pages for the given alliances. Sent by esi-update-alliances.",
  trigger: { type: "event" },
  retries: 5,
  handler: async (ctx) => {
    const { allianceIds } = ctx.payload;
    const url = await postWebAppRevalidation({
      siteUrl: env.NEXT_PUBLIC_SITE_URL,
      cronSecret: env.CRON_SECRET,
      path: "/api/revalidate/alliances",
      body: { allianceIds },
    });
    ctx.logger.info(
      `Revalidated ${allianceIds.length} alliance page(s) at ${url}`,
    );
    return { url, alliances: allianceIds.length };
  },
});
