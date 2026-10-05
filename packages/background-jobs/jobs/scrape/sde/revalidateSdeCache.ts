import { defineJob } from "../../../core";
import { env } from "../../../env";
import { postWebAppRevalidation } from "../../../helpers/postWebAppRevalidation";

export interface RevalidateSdeCacheEventPayload {
  data: Record<string, never>;
}

/**
 * POSTs to the web app's `/api/revalidate/sde`, which drops every page and
 * cache entry built from SDE data. Returns the URL it called. Errors are as
 * {@link postWebAppRevalidation} describes.
 */
export const postSdeCacheRevalidation = ({
  siteUrl,
  cronSecret,
}: {
  siteUrl: string | undefined;
  cronSecret: string | undefined;
}): Promise<string> =>
  postWebAppRevalidation({ siteUrl, cronSecret, path: "/api/revalidate/sde" });

/**
 * Tells the web app that the database is on a new SDE build, so pages cached
 * from the previous one are rebuilt. The web app caches SDE reads with
 * `cacheLife("max")` (up to a month) and relies on this to learn that they
 * changed.
 *
 * Sent by `ingest-sde-all` once every table is on the new build. It is a job
 * of its own, not a step in that one, so a failed call is retried on its own
 * instead of re-running a 45-minute ingest. Trigger it from the dashboard
 * after writing SDE tables any other way (`bootstrap-database`, a single
 * `ingest-sde-*` task).
 */
export const revalidateSdeCache = defineJob<
  RevalidateSdeCacheEventPayload["data"]
>({
  id: "revalidate-sde-cache",
  name: "Revalidate the web app's SDE cache",
  description:
    "Tell the web app to rebuild its cached SDE pages. Run automatically after ingest-sde-all.",
  trigger: { type: "event" },
  concurrencyLimit: 1,
  retries: 5,
  handler: async (ctx) => {
    const url = await postSdeCacheRevalidation({
      siteUrl: env.NEXT_PUBLIC_SITE_URL,
      cronSecret: env.CRON_SECRET,
    });
    ctx.logger.info(`Revalidated the SDE cache at ${url}`);
    return { url };
  },
});
