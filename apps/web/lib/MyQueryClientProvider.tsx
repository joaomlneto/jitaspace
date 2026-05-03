"use client";

import type { PropsWithChildren } from "react";
import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ReactQueryStreamedHydration } from "@tanstack/react-query-next-experimental";

import { setUserAgent } from "@jitaspace/esi-client";

type MyQueryClientProviderProps = PropsWithChildren<{
  esiUserAgent?: string;
}>;

export const MyQueryClientProvider = ({
  children,
  esiUserAgent,
}: MyQueryClientProviderProps) => {
  const [client] = useState(new QueryClient());

  useEffect(() => {
    setUserAgent(esiUserAgent);
  }, [esiUserAgent]);

  return (
    <QueryClientProvider client={client}>
      <ReactQueryStreamedHydration>{children}</ReactQueryStreamedHydration>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
};
