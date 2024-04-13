"use client";

import React, { memo, useMemo } from "react";
import { Avatar, JsonInput, Skeleton, type AvatarProps } from "@mantine/core";

import { useGetIconById } from "@jitaspace/sde-client";





export type EveIconAvatarProps = Omit<AvatarProps, "src"> & {
  iconId?: number | null;
};

export const EveIconAvatar = memo(
  ({ iconId, alt, ...otherProps }: EveIconAvatarProps) => {
    const { data, isLoading } = useGetIconById(iconId ?? 0);

    const DEFAULT_FILENAME = "7_64_15.png";

    const url = useMemo(() => {
      const filename = data?.data.iconFile.split("/").at(-1);
      return `https://iec.jita.space/items/${filename ?? DEFAULT_FILENAME}`;
    }, [data?.data?.iconFile]);

    return (
      <>
        <JsonInput
          value={JSON.stringify({ data: data?.data, url }, null, 2)}
          autosize
        />
        <Skeleton visible={isLoading}>
          <Avatar src={url} alt={alt ?? `Icon ${iconId}`} {...otherProps}>
            <Avatar
              src="https://iec.jita.space/items/0"
              alt={alt ?? `Icon 0`}
              {...otherProps}
            />
          </Avatar>
        </Skeleton>
      </>
    );
  },
);
EveIconAvatar.displayName = "EveIconAvatar";
