"use client";

import type { PropsWithChildren } from "react";
import { useEffect, useState } from "react";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ReactQueryStreamedHydration } from "@tanstack/react-query-next-experimental";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { del, get, set } from "idb-keyval";

import { setAcceptLanguage, setUserAgent } from "@jitaspace/esi-client";

import { usePreferencesStore } from "~/lib/preferences";

// How long a cached query is kept and considered restorable while offline.
// gcTime must be >= this so queries aren't garbage-collected before they persist.
const PERSIST_MAX_AGE = 1000 * 60 * 60 * 24; // 24 hours

// Bump this whenever the shape of cached data changes so incompatible caches
// from older app versions are discarded on restore instead of being shown.
const PERSIST_BUSTER = "jita-query-cache-v1";

// Persist the React Query cache to IndexedDB so previously-loaded data (mail,
// skills, wallet, market, …) is still viewable on reload and while offline.
// IndexedDB handles larger payloads than localStorage. When IndexedDB isn't
// available (SSR, older browsers, jsdom in tests) we fall back to a no-op store
// so the provider degrades gracefully to in-memory-only caching.
const hasIndexedDb =
  typeof window !== "undefined" && typeof window.indexedDB !== "undefined";

const queryCachePersister = createAsyncStoragePersister({
  key: "JITASPACE_QUERY_CACHE",
  storage: hasIndexedDb
    ? {
        getItem: (key) => get<string>(key).then((value) => value ?? null),
        setItem: (key, value) => set(key, value),
        removeItem: (key) => del(key),
      }
    : {
        getItem: () => Promise.resolve(null),
        setItem: () => Promise.resolve(),
        removeItem: () => Promise.resolve(),
      },
});

type MyQueryClientProviderProps = PropsWithChildren<{
  esiUserAgent?: string;
  esiAcceptLanguage?: string;
}>;

export const MyQueryClientProvider = ({
  children,
  esiUserAgent,
}: MyQueryClientProviderProps) => {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Keep data around long enough to be persisted and shown offline.
            gcTime: PERSIST_MAX_AGE,
          },
        },
      }),
  );

  useEffect(() => {
    void (async () => {
      await usePreferencesStore.persist.rehydrate();
      setUserAgent(esiUserAgent);
      setAcceptLanguage(usePreferencesStore.getState().esiAcceptLanguage);
    })();
  }, [esiUserAgent]);

  useEffect(() => {
    const unsubscribe = usePreferencesStore.subscribe(
      (state, previousState) => {
        if (state.esiAcceptLanguage === previousState.esiAcceptLanguage) {
          return;
        }

        setAcceptLanguage(state.esiAcceptLanguage);
        void client.invalidateQueries({ refetchType: "all" });
      },
    );

    return () => {
      unsubscribe();
    };
  }, [client]);

  return (
    <PersistQueryClientProvider
      client={client}
      persistOptions={{
        persister: queryCachePersister,
        maxAge: PERSIST_MAX_AGE,
        buster: PERSIST_BUSTER,
      }}
    >
      <ReactQueryStreamedHydration>{children}</ReactQueryStreamedHydration>
      <ReactQueryDevtools initialIsOpen={false} />
    </PersistQueryClientProvider>
  );
};
