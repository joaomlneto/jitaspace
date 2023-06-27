import React, { memo } from "react";
import { Skeleton, Text, type TextProps } from "@mantine/core";

import {
  useEsiClientContext,
  useGetCharactersCharacterIdMailLists,
  useGetCharactersCharacterIdMailMailId,
} from "@jitaspace/esi-client";

import { EveEntityName } from "./index";

export type EveMailSenderNameProps = TextProps & {
  messageId?: number;
};
export const EveMailSenderName = memo(
  ({ messageId, ...otherProps }: EveMailSenderNameProps) => {
    const { characterId, isTokenValid } = useEsiClientContext();

    const { data: mail, isLoading } = useGetCharactersCharacterIdMailMailId(
      characterId ?? 0,
      messageId ?? 0,
      undefined,
      {
        swr: {
          enabled: isTokenValid && !!messageId,
        },
      },
    );

    const { data: mailingLists, isLoading: mailingListsLoading } =
      useGetCharactersCharacterIdMailLists(
        characterId ?? 1,
        {},
        {
          swr: {
            enabled: isTokenValid,
          },
        },
      );

    if (!mail?.data.from || mailingListsLoading) {
      return (
        <Skeleton visible={isLoading}>
          <Text {...otherProps}>Unknown</Text>
        </Skeleton>
      );
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
