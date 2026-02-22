"use client";

import React, { memo } from "react";
import { Skeleton, Text, type TextProps } from "@mantine/core";

import {
  useGetCharactersCharacterIdMailLists,
  useGetCharactersCharacterIdMailMailId,
} from "@jitaspace/esi-client";
import { useAccessToken } from "@jitaspace/hooks";

import { EveEntityName } from "./index";


export type EveMailSenderNameProps = TextProps & {
  characterId: number;
  messageId?: number;
};
export const EveMailSenderName = memo(
  ({ characterId, messageId, ...otherProps }: EveMailSenderNameProps) => {
    const { accessToken, authHeaders } = useAccessToken({
      characterId,
      scopes: ["esi-mail.read_mail.v1"],
    });

    const { data: mail, isLoading } = useGetCharactersCharacterIdMailMailId(
      characterId ?? 0,
      messageId ?? 0,
      {},
      { ...authHeaders },
      {
        query: {
          enabled: accessToken !== null && !!messageId,
        },
      },
    );

    const { data: mailingLists, isLoading: mailingListsLoading } =
      useGetCharactersCharacterIdMailLists(
        characterId ?? 1,
        {},
        { ...authHeaders },
        {
          query: {
            enabled: accessToken !== null,
          },
        },
      );

    if (!mail?.data.from || mailingListsLoading) {
      if (isLoading) {
        const placeholder = "Unknown";
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
      return <Text {...otherProps}>Unknown</Text>;
    }

    const mailingListMatch = mailingLists?.data.find(
      (item) => item.mailing_list_id === mail?.data.from,
    );

    if (mailingListMatch) {
      return <Text {...otherProps}>{mailingListMatch.name}</Text>;
    }

    return <EveEntityName entityId={mail?.data.from} {...otherProps} />;
  },
);
EveMailSenderName.displayName = "EveMailSenderName";
