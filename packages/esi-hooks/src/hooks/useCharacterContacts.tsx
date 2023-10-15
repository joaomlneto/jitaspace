import { useEffect } from "react";
import { QueryFunctionContext, QueryKey } from "@tanstack/react-query";

import {
  getCharactersCharacterIdContacts,
  useGetCharactersCharacterIdContactsInfinite,
  useGetCorporationsCorporationIdContactsLabels,
} from "@jitaspace/esi-client-kubb";

import { useEsiClientContext } from "./useEsiClientContext";

export function useCharacterContacts() {
  const { isTokenValid, characterId, scopes, accessToken } =
    useEsiClientContext();

  const { data: labels } = useGetCorporationsCorporationIdContactsLabels(
    characterId ?? 0,
    {},
    {},
    {
      query: {
        enabled:
          !!characterId &&
          isTokenValid &&
          scopes.includes("esi-characters.read_contacts.v1"),
        refetchOnWindowFocus: false,
      },
    },
  );

  const { data, isLoading, error, fetchNextPage, hasNextPage, refetch } =
    useGetCharactersCharacterIdContactsInfinite(
      characterId ?? 0,
      { token: accessToken },
      {},
      {
        query: {
          enabled:
            characterId !== undefined &&
            isTokenValid &&
            scopes.includes("esi-characters.read_contacts.v1"),
          queryFn: ({ pageParam }: QueryFunctionContext<QueryKey, any>) =>
            getCharactersCharacterIdContacts(characterId ?? 0, {
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

  useEffect(() => {
    if (hasNextPage) fetchNextPage();
  }, [hasNextPage, fetchNextPage]);

  /*
  const { data, error, isLoading, isValidating, size, setSize, mutate } =
    useSWRInfinite<GetCharactersCharacterIdContactsQueryResponse[], Error>(
      function getKey(pageIndex) {
        if (
          !characterId ||
          !isTokenValid ||
          !scopes.includes("esi-characters.read_contacts.v1")
        ) {
          throw new Error(
            "Insufficient permissions to read character contacts",
          );
        }

        return () => {
          const [endpointUrl] =
            getCharactersCharacterIdContactsQueryKey(characterId, {page: pageIndex + 1});
          return `${ESI_BASE_URL}${endpointUrl}?${queryParams.toString()}`;
        };
      },
      (url: string) =>
        fetch(url, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        }).then((r) => {
          const numPagesString = r.headers.get("x-pages");
          const numPages =
            numPagesString !== null ? parseInt(numPagesString) : undefined;
          if (numPages && numPages !== size) {
            //setNumPages(numPages);
            void setSize(numPages);
          }
          return r.json();
        }),
      { revalidateAll: true },
    );

  const { data: labels } = useGetCorporationsCorporationIdContactsLabels(
    characterId ?? 0,
    {},
    {
      swr: {
        enabled:
          !!characterId &&
          isTokenValid &&
          scopes.includes("esi-characters.read_contacts.v1"),
        revalidateOnFocus: false,
      },
    },
  );

  return {
    data: data?.flat() ?? [],
    labels: labels?.data ?? [],
    error,
    isLoading,
    isValidating,
    mutate,
  };*/

  return {
    data: (data?.pages ?? []).flatMap((res) => res.data ?? []),
    labels: labels?.data ?? [],
    error,
    isLoading,
    mutate: () => {},
  };
}
