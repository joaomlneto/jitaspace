"use client";

import React, { memo, useMemo } from "react";
import { Avatar, Skeleton, type AvatarProps } from "@mantine/core";

import { useGetIconById } from "@jitaspace/sde-client";

import { EveIconAvatarPlaceholder } from "./EveIconAvatarPlaceholder";


export type EveIconAvatarProps = Omit<AvatarProps, "src"> & {
  iconId?: number | null;
};

export const EveIconAvatar = memo(
  ({ iconId, alt, ...otherProps }: EveIconAvatarProps) => {
    const { data, isPending } = useGetIconById(iconId ?? 0);

    const url = useMemo(() => {
      const prefix = "res:/ui/texture/icons/";
      const filename = data?.data.iconFile.slice(prefix.length);
      return `https://iec.jita.space/items/${filename}`;
    }, [data?.data?.iconFile]);

    return (
      <Skeleton visible={isPending}>
        <Avatar src={url} alt={alt ?? `Icon ${iconId}`} {...otherProps}>
          <EveIconAvatarPlaceholder {...otherProps} />
        </Avatar>
      </Skeleton>
    );
  },
);
EveIconAvatar.displayName = "EveIconAvatar";
