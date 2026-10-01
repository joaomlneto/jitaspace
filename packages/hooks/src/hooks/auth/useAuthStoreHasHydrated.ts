"use client";

import { useSyncExternalStore } from "react";

import { useAuthStore } from "./useAuthStore";

// Only ever called in the browser: the persisted store's `persist` API is not
// wired up during SSR/prerender, where React reads getServerSnapshot instead.
const subscribe = (onChange: () => void) => {
  const unsubscribeStart = useAuthStore.persist.onHydrate(onChange);
  const unsubscribeFinish = useAuthStore.persist.onFinishHydration(onChange);
  return () => {
    unsubscribeStart();
    unsubscribeFinish();
  };
};
const getSnapshot = () => useAuthStore.persist.hasHydrated();
const getServerSnapshot = () => false;

/**
 * Whether the persisted auth store has finished rehydrating from localStorage.
 *
 * The store is created with `skipHydration`, so on the server this is `false`;
 * it flips to `true` once rehydration completes. Without it, "no characters are
 * logged in" and "the session has not loaded yet" are indistinguishable, and UI
 * keyed on the former flashes on every page load.
 *
 * While React is hydrating server HTML it reads `getServerSnapshot`, so this is
 * `false` then too, whatever the store's state, and only becomes `true` in the
 * re-render React schedules straight after. That matters for content inside a
 * `<Suspense>` boundary: it can hydrate after the auth store has already
 * rehydrated, and reading the live value there rendered the client differently
 * from the server (a hydration error on every load of /mail). A mount that is
 * not a hydration, such as a client-side navigation, reads the live value
 * directly.
 */
export const useAuthStoreHasHydrated = (): boolean =>
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
