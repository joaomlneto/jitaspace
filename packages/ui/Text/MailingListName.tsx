"use client";

import { memo } from "react";
import { Skeleton, Text, type TextProps } from "@mantine/core";

import { useGetCharactersCharacterIdMailLists } from "@jitaspace/esi-client";
import { useAccessToken } from "@jitaspace/hooks";





export type MailingListNameProps = TextProps & {
  characterId: number;
  mailingListId?: number;
};

export const MailingListName = memo(
  ({ characterId, mailingListId, ...otherProps }: MailingListNameProps) => {
    const { accessToken, authHeaders } = useAccessToken({
      characterId,
      scopes: ["esi-mail.read_mail.v1"],
    });

    const { data, isLoading } = useGetCharactersCharacterIdMailLists(
      characterId ?? 1,
      {},
      { ...authHeaders },
      {
        query: {
          enabled: accessToken !== null,
        },
      },
    );

    if (isLoading) {
      const placeholder = "Unknown Mailing List";
      const skeletonWidth = Math.min(Math.max(placeholder.length, 4), 24);
      return (
        <Text {...otherProps}>
          <Skeleton
            component="span"
            style={{ display: "inline-block" }}
            height="1em"
            width={`${skeletonWidth}ch`}
          />
        </Text>
      );
    }

    return (
      <Text {...otherProps}>
        {data?.data.find((list) => list.mailing_list_id === mailingListId)
          ?.name ?? "Unknown Mailing List"}
      </Text>
    );
  },
);
MailingListName.displayName = "MailingListName";
