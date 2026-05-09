"use client";

import type { PropsWithChildren } from "react";
import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ReactQueryStreamedHydration } from "@tanstack/react-query-next-experimental";

import { setAcceptLanguage, setUserAgent } from "@jitaspace/esi-client";

import { usePreferencesStore } from "~/lib/preferences";

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
