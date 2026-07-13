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
import { esiInfiniteQueryNextPageParam } from "../utils/esiInfiniteQueryNextPageParam";
import { useEsiContacts } from "../utils/useEsiContacts";

export type AllianceContact =
  GetAlliancesAllianceIdContactsQueryResponse[number];

export type AllianceContactLabel =
  GetAlliancesAllianceIdContactsLabelsQueryResponse[number];

export function useAllianceContacts(allianceId: number) {
  const { accessToken, authHeaders } = useAccessToken({
    allianceId,
    scopes: ["esi-alliances.read_contacts.v1"],
  });

  const labelsQuery = useGetAlliancesAllianceIdContactsLabels(
    allianceId,
    { ...authHeaders },
    {
      query: {
        enabled: !!allianceId && accessToken !== null,
        refetchOnWindowFocus: false,
      },
    },
  );

  const contactsQuery = useGetAlliancesAllianceIdContactsInfinite(
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
        getNextPageParam: esiInfiniteQueryNextPageParam,
      },
    },
  );

  return useEsiContacts(contactsQuery, labelsQuery);
}
