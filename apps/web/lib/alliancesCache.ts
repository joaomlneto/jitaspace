/**
 * Tag on the `/alliances` list. `/api/revalidate/alliances` marks it stale
 * whenever the hourly `esi-update-alliances` job changes an alliance.
 */
export const ALLIANCES_CACHE_TAG = "alliances";

/**
 * Tag on one alliance's database read (`app/alliance/[allianceId]/data.ts`).
 * `/api/revalidate/alliances` expires it for every alliance the hourly job
 * changed, so the page it re-renders reads the new rows.
 */
export const allianceCacheTag = (allianceId: number) =>
  `alliance:${allianceId}`;
