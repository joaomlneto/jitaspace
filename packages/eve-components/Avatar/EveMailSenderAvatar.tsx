"use client";

import type { AvatarProps } from "@mantine/core";
import { memo } from "react";
import { Avatar, Skeleton } from "@mantine/core";

import { GroupListIcon } from "@jitaspace/eve-icons";
import { getAvatarSize } from "@jitaspace/utils";

import type { MailingList } from "../types";
import { sizes } from "./Avatar.styles";
import { EveEntityAvatar } from "./index";

export type EveMailSenderAvatarProps = Omit<AvatarProps, "src" | "style"> & {
  from?: number;
  mailingLists?: MailingList[];
};

export const EveMailSenderAvatar = memo(
  ({ from, mailingLists, ...otherProps }: EveMailSenderAvatarProps) => {
    if (!from) {
      return (
        <Skeleton
          visible={true}
          radius={otherProps.radius}
          height={otherProps.size}
          width={otherProps.size}
          circle
        >
          <Avatar {...otherProps} />
        </Skeleton>
      );
    }

    const mailingListMatch = mailingLists?.find(
      (item) => item.mailing_list_id === from,
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

    return <EveEntityAvatar entityId={from} {...otherProps} />;
  },
);
EveMailSenderAvatar.displayName = "EveMailSenderAvatar";
