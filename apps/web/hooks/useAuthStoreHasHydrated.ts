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
  // Initialise from the current state (false during SSR and the first client
  // render; true if a later mount happens after rehydration), then subscribe.
  const [hasHydrated, setHasHydrated] = useState(() =>
    useAuthStore.persist.hasHydrated(),
  );

  useEffect(
    () => useAuthStore.persist.onFinishHydration(() => setHasHydrated(true)),
    [],
  );

  return hasHydrated;
};
