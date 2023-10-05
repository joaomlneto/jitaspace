import useSWRInfinite from "swr/infinite";

import {
  getGetCharactersCharacterIdMailKey,
  type GetCharactersCharacterIdMailParams,
  type GetCharactersCharacterIdMailQueryResponse,
} from "@jitaspace/esi-client-kubb";

import { ESI_BASE_URL } from "../config";
import { useEsiClientContext } from "./useEsiClientContext";

type useCharacterMailsProps = {
  labels?: number[];
};

export function useCharacterMails({ labels }: useCharacterMailsProps) {
  const { isTokenValid, characterId, scopes, accessToken } =
    useEsiClientContext();

  const { data, error, isLoading, isValidating, size, setSize, mutate } =
    useSWRInfinite<GetCharactersCharacterIdMailQueryResponse[], Error>(
      function getKey(
        pageIndex,
        previousPageData: GetCharactersCharacterIdMailQueryResponse[],
      ) {
        if (
          !characterId ||
          !isTokenValid ||
          !scopes.includes("esi-mail.read_mail.v1")
        ) {
          throw new Error("Insufficient permissions to read mail");
        }

        return () => {
          const [endpointUrl] = getGetCharactersCharacterIdMailKey(characterId);
          const params: GetCharactersCharacterIdMailParams = {
            ...(pageIndex > 0
              ? {
                  last_mail_id:
                    pageIndex > 0
                      ? (previousPageData ?? [])
                          .slice(0, 50 * pageIndex)
                          .reduce(
                            (acc, msg) => Math.min(acc, msg.mail_id ?? acc),
                            Infinity,
                          )
                      : undefined,
                }
              : {}),
            labels,
          };
          const searchParams = new URLSearchParams();
          Object.entries(params).forEach(([key, value]) =>
            searchParams.append(key, value.toString()),
          );
          return `${ESI_BASE_URL}${endpointUrl}?${searchParams.toString()}`;
        };
      },
      (url: string) =>
        fetch(url, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        }).then((r) => r.json()),
      { refreshInterval: 30000, revalidateAll: true },
    );

  const messages = data?.flat() ?? [];
  const hasMoreMessages = messages.length === 50 * size;

  const loadMoreMessages = () => {
    void setSize(size + 1);
  };

  return {
    messages,
    hasMoreMessages,
    loadMoreMessages,
    error,
    isLoading,
    isValidating,
    mutate,
  };
}
