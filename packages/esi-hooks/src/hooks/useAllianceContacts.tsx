import {
  getAlliancesAllianceIdContactsQueryKey,
  GetAlliancesAllianceIdContactsQueryResponse,
  useGetAlliancesAllianceId,
  useGetAlliancesAllianceIdContactsLabels,
  useGetCharactersCharacterId,
} from "@jitaspace/esi-client-kubb";

import { ESI_BASE_URL } from "../config";
import { useEsiClientContext } from "./useEsiClientContext";

export function useAllianceContacts() {
  const { isTokenValid, characterId, scopes, accessToken } =
    useEsiClientContext();

  /*
  const { data: characterData } = useGetCharactersCharacterId(characterId ?? 0);

  const { data, error, isLoading, isValidating, size, setSize, mutate } =
    useSWRInfinite<GetAlliancesAllianceIdContactsQueryResponse[], Error>(
      function getKey(pageIndex) {
        if (
          !characterId ||
          !isTokenValid ||
          !scopes.includes("esi-alliances.read_contacts.v1") ||
          characterData?.data.alliance_id === undefined
        ) {
          throw new Error("Insufficient permissions to read alliance contacts");
        }

        return () => {
          const [endpointUrl] = getAlliancesAllianceIdContactsQueryKey(
            characterData.data.alliance_id ?? 0,
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

  const { data: labels } = useGetAlliancesAllianceIdContactsLabels(
    characterData?.data.alliance_id ?? 0,
    {},
    {
      swr: {
        enabled:
          !!characterId &&
          isTokenValid &&
          scopes.includes("esi-alliances.read_contacts.v1") &&
          characterData?.data.alliance_id !== undefined,
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
    data: [],
    labels: [],
    isLoading: true,
    isValidating: true,
    mutate: () => {},
  };
}
