import React, { memo } from "react";
import { Avatar, Skeleton, type AvatarProps } from "@mantine/core";
import { useSession } from "next-auth/react";

import { useGetCharactersCharacterIdMailMailId } from "@jitaspace/esi-client";

import { EveEntityAvatar } from "./index";

export type EveMailSenderAvatarProps = Omit<AvatarProps, "src"> & {
  messageId?: number;
};

export const EveMailSenderAvatar = memo(
  ({ messageId, ...otherProps }: EveMailSenderAvatarProps) => {
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
          <Avatar {...otherProps} />
        </Skeleton>
      );
    }

    return <EveEntityAvatar id={mail?.data.from} {...otherProps} />;
  },
);
EveMailSenderAvatar.displayName = "EveMailSenderAvatar";
