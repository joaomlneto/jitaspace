"use client";

import type { AvatarProps } from "@mantine/core";
import { memo, useMemo } from "react";
import { Avatar } from "@mantine/core";

import { EveIconAvatarPlaceholder } from "./EveIconAvatarPlaceholder";

/**
 * Image for an EVE icon id, served by `@jitaspace/icon-server`. Icon id 0 is
 * the server's own "unknown icon" image, so a missing id still resolves.
 */
export const eveIconUrl = (iconId?: number | null) =>
  `https://icons.jita.space/icons/${iconId ?? 0}`;

export type EveIconAvatarProps = Omit<AvatarProps, "src"> & {
  iconId?: number | null;
};

/**
 * Renders an EVE icon straight from its id — no lookup needed, since the icon
 * server addresses images by icon id. Ids the server doesn't know 404, and
 * Mantine falls back to the placeholder child.
 */
export const EveIconAvatar = memo(
  ({ iconId, alt, ...otherProps }: EveIconAvatarProps) => {
    const url = useMemo(() => eveIconUrl(iconId), [iconId]);

    return (
      <Avatar src={url} alt={alt ?? `Icon ${iconId}`} {...otherProps}>
        <EveIconAvatarPlaceholder {...otherProps} />
      </Avatar>
    );
  },
);
EveIconAvatar.displayName = "EveIconAvatar";
