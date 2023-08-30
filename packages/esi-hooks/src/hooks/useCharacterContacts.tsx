import useSWRInfinite from "swr/infinite";

import {
  getGetCharactersCharacterIdContactsKey,
  useGetCorporationsCorporationIdContactsLabels,
  type GetCharactersCharacterIdContacts200Item,
} from "@jitaspace/esi-client";

import { ESI_BASE_URL } from "../config";
import { useEsiClientContext } from "./useEsiClientContext";

export function useCharacterContacts() {
  const { isTokenValid, characterId, scopes, accessToken } =
    useEsiClientContext();

  const { data, error, isLoading, isValidating, size, setSize, mutate } =
    useSWRInfinite<GetCharactersCharacterIdContacts200Item[], Error>(
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
            getGetCharactersCharacterIdContactsKey(characterId);
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
  };
}
