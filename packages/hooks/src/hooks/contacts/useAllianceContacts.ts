import { useMemo } from "react";
import { QueryFunctionContext, QueryKey } from "@tanstack/react-query";

import {
  getAlliancesAllianceIdContacts,
  GetAlliancesAllianceIdContactsLabelsQueryResponse,
  GetAlliancesAllianceIdContactsQueryResponse,
  useGetAlliancesAllianceIdContactsInfinite,
  useGetAlliancesAllianceIdContactsLabels,
  useGetCharactersCharacterId,
} from "@jitaspace/esi-client";

import { useEsiClientContext } from "../useEsiClientContext";

export type AllianceContact =
  GetAlliancesAllianceIdContactsQueryResponse[number];

export type AllianceContactLabel =
  GetAlliancesAllianceIdContactsLabelsQueryResponse[number];

export function useAllianceContacts() {
  const { isTokenValid, characterId, scopes, accessToken } =
    useEsiClientContext();

  const { data: character } = useGetCharactersCharacterId(
    characterId ?? 0,
    {},
    {},
    { query: { enabled: characterId !== undefined } },
  );

  const allianceId = useMemo(
    () => character?.data.alliance_id ?? null,
    [character?.data.alliance_id],
  );

  const { data: labels } = useGetAlliancesAllianceIdContactsLabels(
    allianceId ?? 0,
    { token: accessToken },
    {},
    {
      query: {
        enabled:
          !!characterId &&
          isTokenValid &&
          scopes.includes("esi-alliances.read_contacts.v1") &&
          allianceId !== undefined,
        refetchOnWindowFocus: false,
      },
    },
  );

  const { data, isLoading, error, fetchNextPage, hasNextPage, refetch } =
    useGetAlliancesAllianceIdContactsInfinite(
      allianceId ?? 0,
      { token: accessToken },
      {},
      {
        query: {
          enabled:
            characterId !== undefined &&
            isTokenValid &&
            scopes.includes("esi-alliances.read_contacts.v1") &&
            allianceId !== undefined,
          queryFn: ({ pageParam }: QueryFunctionContext<QueryKey, any>) =>
            getAlliancesAllianceIdContacts(allianceId ?? 0, {
              page: pageParam,
              token: accessToken,
            }),
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
