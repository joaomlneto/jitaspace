import { memo } from "react";
import { Skeleton, Text, type TextProps } from "@mantine/core";

import { useGetCharactersCharacterIdMailLists } from "@jitaspace/esi-client";
import { useEsiClientContext } from "@jitaspace/esi-hooks";

export type MailingListNameProps = TextProps & {
  mailingListId?: number;
};

export const MailingListName = memo(
  ({ mailingListId, ...otherProps }: MailingListNameProps) => {
    const { characterId, isTokenValid, accessToken } = useEsiClientContext();

    const { data, isLoading } = useGetCharactersCharacterIdMailLists(
      characterId ?? 1,
      { token: accessToken },
      {},
      {
        query: {
          enabled: isTokenValid,
        },
      },
    );

    return (
      <Skeleton visible={isLoading}>
        <Text {...otherProps}>
          {data?.data.find((list) => list.mailing_list_id === mailingListId)
            ?.name ?? "Unknown Mailing List"}
        </Text>
      </Skeleton>
    );
  },
);
MailingListName.displayName = "MailingListName";
