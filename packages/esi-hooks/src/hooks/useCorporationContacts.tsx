import useSWRInfinite from "swr/infinite";

import {
  getGetCorporationsCorporationIdContactsKey,
  useGetCharactersCharacterId,
  useGetCorporationsCorporationIdContactsLabels,
  type GetCorporationsCorporationIdContacts200Item,
} from "@jitaspace/esi-client";

import { ESI_BASE_URL } from "../config";
import { useEsiClientContext } from "./useEsiClientContext";

export function useCorporationContacts() {
  const { isTokenValid, characterId, scopes, accessToken } =
    useEsiClientContext();

  const { data: characterData } = useGetCharactersCharacterId(characterId ?? 0);

  const { data, error, isLoading, isValidating, size, setSize, mutate } =
    useSWRInfinite<GetCorporationsCorporationIdContacts200Item[], Error>(
      function getKey(pageIndex) {
        if (
          !characterId ||
          !isTokenValid ||
          !scopes.includes("esi-corporations.read_contacts.v1") ||
          !characterData?.data.corporation_id
        ) {
          throw new Error(
            "Insufficient permissions to read corporation contacts",
          );
        }

        return () => {
          const [endpointUrl] = getGetCorporationsCorporationIdContactsKey(
            characterData.data.corporation_id,
          );
          const queryParams = new URLSearchParams();
          queryParams.append("page", `${pageIndex + 1}`);
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
    characterData?.data.corporation_id ?? 0,
    {},
    {
      swr: {
        enabled:
          !!characterId &&
          isTokenValid &&
          scopes.includes("esi-corporations.read_contacts.v1") &&
          characterData?.data.corporation_id !== undefined,
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
  };
}
