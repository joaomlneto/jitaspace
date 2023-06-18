import React, { memo } from "react";
import { Avatar, Skeleton, type AvatarProps } from "@mantine/core";

import {
  useEsiClientContext,
  useGetCharactersCharacterIdMailMailId,
} from "@jitaspace/esi-client";

import { EveEntityAvatar } from "./index";

export type EveMailSenderAvatarProps = Omit<AvatarProps, "src"> & {
  messageId?: number;
};

export const EveMailSenderAvatar = memo(
  ({ messageId, ...otherProps }: EveMailSenderAvatarProps) => {
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
        <Skeleton
          visible={isLoading || !mail?.data.from}
          radius={otherProps.radius}
          height={otherProps.size}
          width={otherProps.size}
          circle
        >
          <Avatar {...otherProps} />
        </Skeleton>
      );
    }

    return <EveEntityAvatar entityId={mail?.data.from} {...otherProps} />;
  },
);
EveMailSenderAvatar.displayName = "EveMailSenderAvatar";
