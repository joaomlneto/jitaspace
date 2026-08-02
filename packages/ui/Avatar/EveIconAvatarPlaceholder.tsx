"use client";

import type { AvatarProps } from "@mantine/core";
import { memo } from "react";
import { Avatar } from "@mantine/core";

export type EveIconAvatarPlaceholderProps = Omit<AvatarProps, "src">;

export const EveIconAvatarPlaceholder = memo(
  ({ alt, ...otherProps }: EveIconAvatarPlaceholderProps) => {
    // Icon id 0 is the icon server's "unknown icon" image.
    const PLACEHOLDER_ICON_ID = 0;

    return (
      <Avatar
        src={`https://icons.jita.space/icons/${PLACEHOLDER_ICON_ID}`}
        alt={alt ?? `Icon Placeholder`}
        {...otherProps}
      />
    );
  },
);
EveIconAvatarPlaceholder.displayName = "EveIconAvatarPlaceholder";
