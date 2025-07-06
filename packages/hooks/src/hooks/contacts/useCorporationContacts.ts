"use client";

import {
  getCorporationsCorporationIdContacts,
  GetCorporationsCorporationIdContactsLabelsQueryResponse,
  GetCorporationsCorporationIdContactsQueryResponse,
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
    corporationId ?? 0,
    {},
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
      corporationId ?? 0,
      {},
      { ...authHeaders },
      {
        query: {
          enabled: !!corporationId && accessToken !== null,
          initialPageParam: 1,
          queryFn: ({ pageParam }) =>
            getCorporationsCorporationIdContacts(
              corporationId ?? 0,
              {
                page: pageParam as number,
              },
              {},
              { headers: { ...authHeaders } },
            ),
          getNextPageParam: (lastPage, pages) => {
            const numPages: number | undefined = lastPage.headers?.["x-pages"];
            const nextPage = pages.length + 1;
            if (nextPage > (numPages ?? 0)) return undefined;
            return nextPage;
          },
        },
      },
    );

  return {
    data: (data?.pages ?? []).flatMap((res) => res.data ?? []),
    labels: labels?.data ?? [],
    error,
    isLoading,
    mutate: refetch,
  };
}
