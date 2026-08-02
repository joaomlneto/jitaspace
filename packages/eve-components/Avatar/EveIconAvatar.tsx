"use client";

import type { AvatarProps } from "@mantine/core";
import { memo } from "react";
import { Skeleton } from "@mantine/core";

import { useGetIconById } from "@jitaspace/sde-client";
import { EveIconAvatarDisplay } from "@jitaspace/ui";

export type EveIconAvatarProps = Omit<AvatarProps, "src"> & {
  iconId?: number | null;
};

export const EveIconAvatar = memo(
  ({ iconId, alt, ...otherProps }: EveIconAvatarProps) => {
    const { data, isPending } = useGetIconById(iconId ?? 0);

    return (
      <Skeleton visible={isPending}>
        <EveIconAvatarDisplay
          iconFile={data?.data.iconFile}
          alt={alt ?? `Icon ${iconId}`}
          {...otherProps}
        />
      </Skeleton>
    );
  },
);
EveIconAvatar.displayName = "EveIconAvatar";
