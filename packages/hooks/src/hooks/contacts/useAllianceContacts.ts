"use client";

import type {
  GetAlliancesAllianceIdContactsLabelsQueryResponse,
  GetAlliancesAllianceIdContactsQueryResponse,
} from "@jitaspace/esi-client";
import {
  getAlliancesAllianceIdContacts,
  useGetAlliancesAllianceIdContactsInfinite,
  useGetAlliancesAllianceIdContactsLabels,
} from "@jitaspace/esi-client";

import { useAccessToken } from "../auth";

export type AllianceContact =
  GetAlliancesAllianceIdContactsQueryResponse[number];

export type AllianceContactLabel =
  GetAlliancesAllianceIdContactsLabelsQueryResponse[number];

export function useAllianceContacts(allianceId: number) {
  const { accessToken, authHeaders } = useAccessToken({
    allianceId,
    scopes: ["esi-alliances.read_contacts.v1"],
  });

  const { data: labels } = useGetAlliancesAllianceIdContactsLabels(
    allianceId,
    { ...authHeaders },
    {
      query: {
        enabled: !!allianceId && accessToken !== null,
        refetchOnWindowFocus: false,
      },
    },
  );

  const { data, isLoading, error, refetch } =
    useGetAlliancesAllianceIdContactsInfinite(
      allianceId,
      {},
      { ...authHeaders },
      {
        query: {
          enabled: accessToken !== null,
          initialPageParam: 1,
          queryFn: ({ pageParam }) =>
            getAlliancesAllianceIdContacts(
              allianceId,
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

  return {
    data: (data?.pages ?? []).flatMap((res) => res.data),
    labels: labels?.data ?? [],
    error,
    isLoading,
    mutate: refetch,
  };
}
