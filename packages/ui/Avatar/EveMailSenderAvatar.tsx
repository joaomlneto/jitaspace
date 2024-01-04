import React, { memo } from "react";
import { Avatar, Skeleton, type AvatarProps } from "@mantine/core";

import {
  useGetCharactersCharacterIdMailLists,
  useGetCharactersCharacterIdMailMailId,
} from "@jitaspace/esi-client";
import { GroupListIcon } from "@jitaspace/eve-icons";
import { useAccessToken } from "@jitaspace/hooks";
import { getAvatarSize } from "@jitaspace/utils";

import { sizes } from "./Avatar.styles";
import { EveEntityAvatar } from "./index";


export type EveMailSenderAvatarProps = Omit<AvatarProps, "src" | "style"> & {
  characterId: number;
  messageId?: number;
};

export const EveMailSenderAvatar = memo(
  ({ characterId, messageId, ...otherProps }: EveMailSenderAvatarProps) => {
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

    const { data: mailingLists, isLoading: mailingListsLoading } =
      useGetCharactersCharacterIdMailLists(
        characterId ?? 1,
        {},
        { ...authHeaders },
        {
          query: {
            enabled: accessToken !== null,
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
          variant={undefined}
        />
      );
    }

    return <EveEntityAvatar entityId={mail?.data.from} {...otherProps} />;
  },
);
EveMailSenderAvatar.displayName = "EveMailSenderAvatar";
