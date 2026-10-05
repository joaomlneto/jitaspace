import { NonRetriableError } from "../core";

/** Where the web app lives when `NEXT_PUBLIC_SITE_URL` is unset — as in the app. */
const DEFAULT_SITE_URL = "https://www.jita.space";

/**
 * POSTs to one of the web app's `/api/revalidate/*` routes with
 * `Authorization: Bearer <CRON_SECRET>`, plus an optional JSON body. Returns
 * the URL it called.
 *
 * Misconfiguration (no secret, a secret the app rejects, or a site URL that is
 * not an absolute URL) throws {@link NonRetriableError}: retrying cannot fix
 * it, and the failed run (which the Trigger.dev adapter reports to Sentry) is
 * the only sign that the web app is still serving stale pages. Anything else
 * (a 5xx, a timeout, a network error) throws a plain error so the run is
 * retried.
 */
export async function postWebAppRevalidation({
  siteUrl,
  cronSecret,
  path,
  body,
}: {
  siteUrl: string | undefined;
  cronSecret: string | undefined;
  path: string;
  body?: unknown;
}): Promise<string> {
  if (!cronSecret) {
    throw new NonRetriableError(
      "CRON_SECRET is not set, so the web app's cache cannot be revalidated. Set it to the web app's CRON_SECRET.",
    );
  }
  // A blank value (a cleared env var) means unset, too, which `??` would miss.
  const base = siteUrl?.trim() ? siteUrl : DEFAULT_SITE_URL;
  let url: string;
  try {
    url = new URL(path, base).href;
  } catch {
    throw new NonRetriableError(
      `NEXT_PUBLIC_SITE_URL is not an absolute URL ("${base}"). Set it to the web app's origin, e.g. https://www.jita.space.`,
    );
  }
  const res = await fetch(url, {
    method: "POST",
    headers:
      body === undefined
        ? { authorization: `Bearer ${cronSecret}` }
        : {
            authorization: `Bearer ${cronSecret}`,
            "content-type": "application/json",
          },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
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
