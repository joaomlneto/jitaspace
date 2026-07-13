"use client";

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
import { esiInfiniteQueryNextPageParam } from "../utils/esiInfiniteQueryNextPageParam";
import { useEsiContacts } from "../utils/useEsiContacts";

export type CorporationContact =
  GetCorporationsCorporationIdContactsQueryResponse[number];

export type CorporationContactLabel =
  GetCorporationsCorporationIdContactsLabelsQueryResponse[number];

export function useCorporationContacts(corporationId: number) {
  const { accessToken, authHeaders } = useAccessToken({
    corporationId,
    scopes: ["esi-corporations.read_contacts.v1"],
  });

  const labelsQuery = useGetCorporationsCorporationIdContactsLabels(
    corporationId,
    { ...authHeaders },
    {
      query: {
        enabled: !!corporationId && accessToken !== null,
        refetchOnWindowFocus: false,
      },
    },
  );

  const contactsQuery = useGetCorporationsCorporationIdContactsInfinite(
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
        getNextPageParam: esiInfiniteQueryNextPageParam,
      },
    },
  );

  return useEsiContacts(contactsQuery, labelsQuery);
}
