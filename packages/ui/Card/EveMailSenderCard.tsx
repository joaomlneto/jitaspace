import React, { memo } from "react";
import { Skeleton, Text } from "@mantine/core";

import {
  useEsiClientContext,
  useGetCharactersCharacterIdMailMailId,
} from "@jitaspace/esi-client";

import { EveEntityCard } from "./EveEntityCard";

export type EveMailSenderCardProps = {
  messageId?: number;
};

export const EveMailSenderCard = memo(
  ({ messageId }: EveMailSenderCardProps) => {
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
