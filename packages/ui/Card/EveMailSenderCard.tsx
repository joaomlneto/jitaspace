import React, { memo } from "react";
import { Skeleton, Text } from "@mantine/core";

import { useGetCharactersCharacterIdMailMailId } from "@jitaspace/esi-client";
import { useAccessToken } from "@jitaspace/hooks";

import { EveEntityCard } from "./EveEntityCard";


export type EveMailSenderCardProps = {
  characterId: number;
  messageId?: number;
};

export const EveMailSenderCard = memo(
  ({ characterId, messageId }: EveMailSenderCardProps) => {
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

    if (!mail?.data.from) {
      return (
        <Skeleton visible={isLoading}>
          <Text>Unknown</Text>
        </Skeleton>
      );
    }

    return <EveEntityCard entityId={mail.data.from} />;
  },
);
EveMailSenderCard.displayName = "EveMailSenderCard";
