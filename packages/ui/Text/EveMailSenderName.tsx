import React, { memo } from "react";
import { Skeleton, Text, type TextProps } from "@mantine/core";

import {
  useEsiClientContext,
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
