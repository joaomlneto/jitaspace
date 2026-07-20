"use client";

import { useEffect, useState } from "react";

import { useAuthStore } from "@jitaspace/hooks";

/**
 * Whether the persisted auth store has finished rehydrating from localStorage.
 *
 * The store is created with `skipHydration`, so on the server and the first
 * client render this is `false`; it flips to `true` once rehydration completes
 * (triggered by the SSO token injector on mount). Use it to avoid flashing
 * logged-out UI — e.g. a "grant permissions" banner — before the persisted
 * session has had a chance to load.
 */
export const useAuthStoreHasHydrated = (): boolean => {
  // Read the current state lazily, and only in the browser: the persisted
  // store's `persist` API isn't wired up during SSR / prerender (no
  // localStorage in Node), so touching it there throws. Server and the first
  // client render therefore start `false` — matching each other, so no
  // hydration mismatch — and the subscription below flips it to `true` once the
  // store finishes rehydrating. A mount that happens after rehydration (e.g. a
  // later client navigation) starts `true` straight away.
  const [hasHydrated, setHasHydrated] = useState(
    () => typeof window !== "undefined" && useAuthStore.persist.hasHydrated(),
  );

  useEffect(
    () => useAuthStore.persist.onFinishHydration(() => setHasHydrated(true)),
    [],
  );

  return hasHydrated;
};
