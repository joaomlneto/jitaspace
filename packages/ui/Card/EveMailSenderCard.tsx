import React, { memo } from "react";
import { Skeleton, Text } from "@mantine/core";

import { useGetCharactersCharacterIdMailMailId } from "@jitaspace/esi-client-kubb";
import { useEsiClientContext } from "@jitaspace/esi-hooks";

import { EveEntityCard } from "./EveEntityCard";

export type EveMailSenderCardProps = {
  messageId?: number;
};

export const EveMailSenderCard = memo(
  ({ messageId }: EveMailSenderCardProps) => {
    const { characterId, isTokenValid, accessToken } = useEsiClientContext();

    const { data: mail, isLoading } = useGetCharactersCharacterIdMailMailId(
      characterId ?? 0,
      messageId ?? 0,
      { token: accessToken },
      {},
      {
        query: {
          enabled: isTokenValid && !!messageId,
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
