import { defineJob, NonRetriableError } from "../../../core";
import { env } from "../../../env";

export interface RevalidateSdeCacheEventPayload {
  data: Record<string, never>;
}

/** Where the web app lives when `NEXT_PUBLIC_SITE_URL` is unset — as in the app. */
const DEFAULT_SITE_URL = "https://www.jita.space";

/**
 * POSTs to the web app's `/api/revalidate/sde`, which drops every page and
 * cache entry built from SDE data. Returns the URL it called.
 *
 * Misconfiguration (no secret, or a secret the app rejects) throws
 * {@link NonRetriableError}: retrying cannot fix it, and the failed run (which
 * the Trigger.dev adapter reports to Sentry) is the only sign that SDE pages
 * are still serving the previous build. Anything else (a 5xx, a timeout, a
 * network error) throws a plain error so the run is retried.
 */
export async function postSdeCacheRevalidation({
  siteUrl,
  cronSecret,
}: {
  siteUrl: string | undefined;
  cronSecret: string | undefined;
}): Promise<string> {
  if (!cronSecret) {
    throw new NonRetriableError(
      "CRON_SECRET is not set, so the web app's SDE cache cannot be revalidated. Set it to the web app's CRON_SECRET.",
    );
  }
  const url = new URL("/api/revalidate/sde", siteUrl ?? DEFAULT_SITE_URL).href;
  const res = await fetch(url, {
    method: "POST",
    headers: { authorization: `Bearer ${cronSecret}` },
    signal: AbortSignal.timeout(30_000),
  });
  if (res.status === 401) {
    throw new NonRetriableError(
      `${url} rejected CRON_SECRET (401). It must match the web app's CRON_SECRET.`,
    );
  }
  if (!res.ok) {
    throw new Error(`${url} answered ${res.status}`);
  }
  return url;
}

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
