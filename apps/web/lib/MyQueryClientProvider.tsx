"use client";

import type { PropsWithChildren } from "react";
import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ReactQueryStreamedHydration } from "@tanstack/react-query-next-experimental";

import { setAcceptLanguage, setUserAgent } from "@jitaspace/esi-client";

import {
  DEFAULT_ESI_ACCEPT_LANGUAGE,
  usePreferencesStore,
} from "~/lib/preferences";

// Seed the ESI language at module scope — before React renders anything, on the
// server pass and in the browser alike.
//
// The effect below can only set it *after* the persisted preferences rehydrate,
// which is after every descendant's effects have already run. Cached ESI names
// are keyed by language (see useEsiAcceptLanguage), so leaving it unset until
// then made the boot transition look like a language switch: every name on the
// first paint resolved once under "no language" and again a microtask later.
// Starting from the app default means that only a user who actually prefers a
// different language pays for a second resolution, which is the whole point.
setAcceptLanguage(DEFAULT_ESI_ACCEPT_LANGUAGE);

type MyQueryClientProviderProps = PropsWithChildren<{
  esiUserAgent?: string;
  esiAcceptLanguage?: string;
}>;

export const MyQueryClientProvider = ({
  children,
  esiUserAgent,
}: MyQueryClientProviderProps) => {
  const [client] = useState(new QueryClient());

  useEffect(() => {
    void (async () => {
      await usePreferencesStore.persist.rehydrate();
      setUserAgent(esiUserAgent);
      // Fires a change only if the persisted preference differs from the
      // default seeded above.
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
    <QueryClientProvider client={client}>
      <ReactQueryStreamedHydration>{children}</ReactQueryStreamedHydration>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
};
