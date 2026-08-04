"use client";

import { useEffect, useState } from "react";

import { useAuthStore } from "./useAuthStore";

/**
 * Whether the persisted auth store has finished rehydrating from localStorage.
 *
 * The store is created with `skipHydration`, so on the server and the first
 * client render this is `false`; it flips to `true` once rehydration completes.
 * Without it, "no characters are logged in" and "the session has not loaded
 * yet" are indistinguishable, and UI keyed on the former flashes on every page
 * load.
 *
 * `apps/web` has its own copy of this hook; that one can re-export this once
 * this package's version ships.
 */
export const useAuthStoreHasHydrated = (): boolean => {
  // Read lazily and only in the browser: the persisted store's `persist` API is
  // not wired up during SSR/prerender, so the server and the first client
  // render both start `false` — matching, so no hydration mismatch — and the
  // subscription below flips it once rehydration finishes. A mount that happens
  // after rehydration starts `true` straight away.
  const [hasHydrated, setHasHydrated] = useState(
    () => typeof window !== "undefined" && useAuthStore.persist.hasHydrated(),
  );

  useEffect(
    () => useAuthStore.persist.onFinishHydration(() => setHasHydrated(true)),
    [],
  );

  return hasHydrated;
};
