"use client";

import type { PropsWithChildren } from "react";
import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ReactQueryStreamedHydration } from "@tanstack/react-query-next-experimental";

import { setAcceptLanguage, setUserAgent } from "@jitaspace/esi-client";

import {
  DEFAULT_ESI_ACCEPT_LANGUAGE,
  EsiAcceptLanguage,
  getStoredEsiAcceptLanguage,
  usePreferencesStore,
} from "~/lib/preferences";

type MyQueryClientProviderProps = PropsWithChildren<{
  esiUserAgent?: string;
  esiAcceptLanguage?: EsiAcceptLanguage;
}>;

export const MyQueryClientProvider = ({
  children,
  esiUserAgent,
  esiAcceptLanguage,
}: MyQueryClientProviderProps) => {
  const [client] = useState(new QueryClient());

  useEffect(() => {
    const fallbackAcceptLanguage =
      esiAcceptLanguage ?? DEFAULT_ESI_ACCEPT_LANGUAGE;

    const storedAcceptLanguage = getStoredEsiAcceptLanguage();
    const initialAcceptLanguage =
      storedAcceptLanguage ?? fallbackAcceptLanguage;
    const currentAcceptLanguage =
      usePreferencesStore.getState().esiAcceptLanguage;

    if (currentAcceptLanguage !== initialAcceptLanguage) {
      usePreferencesStore.setState({
        esiAcceptLanguage: initialAcceptLanguage,
      });
    }

    setUserAgent(esiUserAgent);
    setAcceptLanguage(initialAcceptLanguage);
  }, [esiAcceptLanguage, esiUserAgent]);

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
