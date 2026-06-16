"use client";

import type { AvatarProps } from "@mantine/core";
import { memo } from "react";
import { Avatar } from "@mantine/core";

export type EveIconAvatarPlaceholderProps = Omit<AvatarProps, "src">;

export const EveIconAvatarPlaceholder = memo(
  ({ alt, ...otherProps }: EveIconAvatarPlaceholderProps) => {
    const DEFAULT_FILENAME = "7_64_15.png";

    return (
      <Avatar
        src={`https://iec.jita.space/items/${DEFAULT_FILENAME}`}
        alt={alt ?? `Icon Placeholder`}
        {...otherProps}
      />
    );
  },
);
EveIconAvatarPlaceholder.displayName = "EveIconAvatarPlaceholder";
