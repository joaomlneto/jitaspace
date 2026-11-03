"use client";

import { useSyncExternalStore } from "react";
import { SpeedInsights as VercelSpeedInsights } from "@vercel/speed-insights/next";

const subscribeToNothing = () => () => undefined;

/**
 * Vercel Speed Insights, mounted only in the browser.
 *
 * The `next` entry derives the route from `useParams()` and
 * `useSearchParams()`. Under `cacheComponents` those suspend on a promise that
 * hangs for the length of every prerender: the build's, and the static-shell
 * validation `next dev` runs beside each request. When the prerender ends the
 * promise rejects with `HANGING_PROMISE_REJECTION`, and if that reaches a
 * render the boundary errors and the dev overlay reports it on every route.
 * Nothing it renders reaches the HTML (it returns `null` and injects its
 * script from an effect), so rendering it only after hydration loses no data
 * and keeps those hooks out of server rendering altogether.
 */
export function SpeedInsights() {
  const isClient = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );
  return isClient ? <VercelSpeedInsights /> : null;
}
