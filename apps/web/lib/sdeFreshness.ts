import { cacheLife } from "next/cache";

import { prisma } from "~/lib/db";

/**
 * How fresh our SDE-derived data is.
 *
 * The /status page compares this against CCP's latest SDE release date to flag
 * an ingest that has fallen behind. It lives here rather than in the page so the
 * `"use cache"` boundary (and the table choice below) can be unit-tested — the
 * same split `lib/history-cache.ts` uses for the change-history reads.
 */

/**
 * The tables sampled to date the SDE ingest.
 *
 * Every one of these is written *only* by the SDE ingest jobs. Tables the ESI
 * scrapers also write (Type, SolarSystem, DogmaAttribute, …) are deliberately
 * excluded: an ESI run touching one of those would report the SDE as fresher
 * than it actually is. The sample deliberately spans unrelated corners of the
 * SDE — items, certificates, cosmetics, materials and map furniture — because a
 * release that changed nothing at all in every one of them would be unheard of.
 */
export const SDE_FRESHNESS_TABLES = [
  "blueprint",
  "certificate",
  "skin",
  "typeMaterial",
  "landmark",
] as const;

export type SdeFreshnessTable = (typeof SDE_FRESHNESS_TABLES)[number];

/**
 * The latest of a set of possibly-missing timestamps, or null when there are
 * none. Kept separate from the query so the comparison is testable without a
 * database.
 */
export function newestDate(dates: (Date | null | undefined)[]): Date | null {
  return dates.reduce<Date | null>(
    (latest, date) =>
      date == null || (latest !== null && date <= latest) ? latest : date,
    null,
  );
}

/**
 * The newest `updatedAt` across {@link SDE_FRESHNESS_TABLES}, as an ISO string,
 * or null when every sampled table is empty.
 *
 * Cached for hours: an ingest runs at most daily, and the /status page does not
 * need this to the minute.
 */
export async function getSdeDataUpdatedAt(): Promise<string | null> {
  "use cache";
  cacheLife("hours");

  // Spelled out rather than indexed off `SDE_FRESHNESS_TABLES`, because each
  // Prisma delegate is a distinct type and indexing the client would need an
  // `as unknown as` cast to type-check. `sdeFreshness.test.ts` asserts these
  // calls stay in step with the constant above, so the two cannot drift apart.
  const results = await Promise.all([
    prisma.blueprint.aggregate({ _max: { updatedAt: true } }),
    prisma.certificate.aggregate({ _max: { updatedAt: true } }),
    prisma.skin.aggregate({ _max: { updatedAt: true } }),
    prisma.typeMaterial.aggregate({ _max: { updatedAt: true } }),
    prisma.landmark.aggregate({ _max: { updatedAt: true } }),
  ]);

  return (
    newestDate(results.map((result) => result._max.updatedAt))?.toISOString() ??
    null
  );
}
