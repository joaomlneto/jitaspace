import React, { memo } from "react";
import { Avatar, Skeleton, type AvatarProps } from "@mantine/core";

import {
  useGetCharactersCharacterIdMailLists,
  useGetCharactersCharacterIdMailMailId,
} from "@jitaspace/esi-client";
import { useEsiClientContext } from "@jitaspace/esi-hooks";
import { GroupListIcon } from "@jitaspace/eve-icons";
import { getAvatarSize } from "@jitaspace/utils";

import { sizes } from "./Avatar.styles";
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

    const mailingListMatch = mailingLists?.data.find(
      (item) => item.mailing_list_id === mail?.data.from,
    );

    if (mailingListMatch) {
      const avatarSize = getAvatarSize({
        size: otherProps.size ?? "md",
        sizes,
      });
      return (
        <GroupListIcon
          width={avatarSize}
          height={avatarSize}
          {...otherProps}
          style={undefined} // FIXME MANTINE V7 MIGRATION
          variant={undefined}
        />
      );
    }

    return <EveEntityAvatar entityId={mail?.data.from} {...otherProps} />;
  },
);
EveMailSenderAvatar.displayName = "EveMailSenderAvatar";
