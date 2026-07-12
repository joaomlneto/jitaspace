"use client";

import { useEffect } from "react";

import type {
  GetCorporationsCorporationIdContactsLabelsQueryResponse,
  GetCorporationsCorporationIdContactsQueryResponse,
} from "@jitaspace/esi-client";
import {
  getCorporationsCorporationIdContacts,
  useGetCorporationsCorporationIdContactsInfinite,
  useGetCorporationsCorporationIdContactsLabels,
} from "@jitaspace/esi-client";

import { useAccessToken } from "../auth";

export type CorporationContact =
  GetCorporationsCorporationIdContactsQueryResponse[number];

export type CorporationContactLabel =
  GetCorporationsCorporationIdContactsLabelsQueryResponse[number];

export function useCorporationContacts(corporationId: number) {
  const { accessToken, authHeaders } = useAccessToken({
    corporationId,
    scopes: ["esi-corporations.read_contacts.v1"],
  });

  const { data: labels } = useGetCorporationsCorporationIdContactsLabels(
    corporationId,
    { ...authHeaders },
    {
      query: {
        enabled: !!corporationId && accessToken !== null,
        refetchOnWindowFocus: false,
      },
    },
  );

  const { data, isLoading, error, fetchNextPage, hasNextPage, refetch } =
    useGetCorporationsCorporationIdContactsInfinite(
      corporationId,
      {},
      { ...authHeaders },
      {
        query: {
          enabled: !!corporationId && accessToken !== null,
          initialPageParam: 1,
          queryFn: ({ pageParam }) =>
            getCorporationsCorporationIdContacts(
              corporationId,
              {
                page: pageParam,
              },
              { ...authHeaders },
            ),
          getNextPageParam: (lastPage, pages) => {
            const xPages: unknown = lastPage.headers["x-pages"];
            const numPages = typeof xPages === "string" ? Number(xPages) : 0;
            const nextPage = pages.length + 1;
            if (nextPage > numPages) return undefined;
            return nextPage;
          },
        },
      },
    );

  // fetch everything immediately
  useEffect(() => {
    if (hasNextPage) void fetchNextPage();
  }, [hasNextPage, fetchNextPage]);

  return {
    data: (data?.pages ?? []).flatMap((res) => res.data),
    labels: labels?.data ?? [],
    error,
    isLoading,
    mutate: refetch,
  };
}
