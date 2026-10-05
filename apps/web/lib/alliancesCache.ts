/**
 * Tag on the `/alliances` list. `/api/revalidate/alliances` marks it stale
 * whenever the hourly `esi-update-alliances` job changes an alliance.
 */
export const ALLIANCES_CACHE_TAG = "alliances";
