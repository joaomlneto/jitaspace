import useSWRInfinite from "swr/infinite";

import { ESI_BASE_URL } from "~/config/constants";
import {
  getGetAlliancesAllianceIdContactsKey,
  useGetAlliancesAllianceIdContactsLabels,
  useGetCharactersCharacterId,
  type GetAlliancesAllianceIdContacts200Item,
} from "../client";
import { useEsiClientContext } from "./useEsiClientContext";

export function useAllianceContacts() {
  const { isTokenValid, characterId, scopes, accessToken } =
    useEsiClientContext();

  const { data: characterData } = useGetCharactersCharacterId(characterId ?? 0);

  const { data, error, isLoading, isValidating, size, setSize, mutate } =
    useSWRInfinite<GetAlliancesAllianceIdContacts200Item[], Error>(
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
          const [endpointUrl] = getGetAlliancesAllianceIdContactsKey(
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
  };
}
