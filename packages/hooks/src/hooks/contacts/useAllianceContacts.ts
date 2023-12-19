import { QueryFunctionContext, QueryKey } from "@tanstack/react-query";

import {
  getAlliancesAllianceIdContacts,
  GetAlliancesAllianceIdContactsLabelsQueryResponse,
  GetAlliancesAllianceIdContactsQueryResponse,
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
    allianceId ?? 0,
    {},
    { ...authHeaders },
    {
      query: {
        enabled: !!allianceId && accessToken !== null,
        refetchOnWindowFocus: false,
      },
    },
  );

  const { data, isLoading, error, fetchNextPage, hasNextPage, refetch } =
    useGetAlliancesAllianceIdContactsInfinite(
      allianceId ?? 0,
      {},
      { ...authHeaders },
      {
        query: {
          enabled: accessToken !== null && allianceId !== undefined,
          queryFn: ({ pageParam }: QueryFunctionContext<QueryKey, any>) =>
            getAlliancesAllianceIdContacts(
              allianceId ?? 0,
              {
                page: pageParam,
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
