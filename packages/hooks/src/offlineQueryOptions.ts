/**
 * Query options that mark a hook's data as worth persisting for offline
 * viewing. The web app's query-cache persister only writes queries flagged
 * `meta.persist`, and `gcTime` keeps the data in memory long enough to be
 * persisted and restored (it must be >= the persister's maxAge, currently 24h).
 *
 * Spread this into the `query` options of character-scoped, offline-worthy
 * hooks (mail, skills, wallet, assets, contacts).
 */
export const offlinePersistedQueryOptions = {
  gcTime: 1000 * 60 * 60 * 24, // 24 hours — matches the persister maxAge
  meta: { persist: true },
} as const;
