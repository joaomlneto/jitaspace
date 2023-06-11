import React, { memo } from "react";
import { Skeleton, Text, type TextProps } from "@mantine/core";
import { useSession } from "next-auth/react";

import { useGetCharactersCharacterIdMailMailId } from "@jitaspace/esi-client";

import { EveEntityName } from "./index";

export type EveMailSenderNameProps = TextProps & {
  messageId?: number;
};
export const EveMailSenderName = memo(
  ({ messageId, ...otherProps }: EveMailSenderNameProps) => {
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
          <Text {...otherProps}>Unknown</Text>
        </Skeleton>
      );
    }

    return <EveEntityName entityId={mail?.data.from} {...otherProps} />;
  },
);
EveMailSenderName.displayName = "EveMailSenderName";
