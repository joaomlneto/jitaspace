import { useMemo } from "react";
import { QueryFunctionContext, QueryKey } from "@tanstack/react-query";

import {
  getCorporationsCorporationIdContacts,
  useGetCharactersCharacterId,
  useGetCorporationsCorporationIdContactsInfinite,
  useGetCorporationsCorporationIdContactsLabels,
} from "@jitaspace/esi-client-kubb";

import { useEsiClientContext } from "./useEsiClientContext";

export function useCorporationContacts() {
  const { isTokenValid, characterId, scopes, accessToken } =
    useEsiClientContext();

  const { data: character } = useGetCharactersCharacterId(
    characterId ?? 0,
    {},
    {},
    { query: { enabled: characterId !== undefined } },
  );

  const corporationId = useMemo(
    () => character?.data.corporation_id,
    [character?.data],
  );

  const { data: labels } = useGetCorporationsCorporationIdContactsLabels(
    corporationId ?? 0,
    {},
    {},
    {
      query: {
        enabled:
          !!characterId &&
          isTokenValid &&
          scopes.includes("esi-corporations.read_contacts.v1") &&
          corporationId !== undefined,
        refetchOnWindowFocus: false,
      },
    },
  );

  const { data, isLoading, error, fetchNextPage, hasNextPage, refetch } =
    useGetCorporationsCorporationIdContactsInfinite(
      corporationId ?? 0,
      { token: accessToken },
      {},
      {
        query: {
          enabled:
            characterId !== undefined &&
            isTokenValid &&
            scopes.includes("esi-corporations.read_contacts.v1") &&
            corporationId !== undefined,
          queryFn: ({ pageParam }: QueryFunctionContext<QueryKey, any>) =>
            getCorporationsCorporationIdContacts(corporationId ?? 0, {
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
