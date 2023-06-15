import React, { memo } from "react";
import { Skeleton, Text } from "@mantine/core";
import { useSession } from "next-auth/react";

import { useGetCharactersCharacterIdMailMailId } from "@jitaspace/esi-client";

import { EveEntityCard } from "./EveEntityCard";

export type EveMailSenderCardProps = {
  messageId?: number;
};

export const EveMailSenderCard = memo(
  ({ messageId }: EveMailSenderCardProps) => {
    const { data: session } = useSession();

    const { data: mail, isLoading } = useGetCharactersCharacterIdMailMailId(
      session?.user.id ?? 0,
      messageId ?? 0,
      undefined,
      {
        swr: {
          enabled: !!session?.user.id && !!messageId,
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
