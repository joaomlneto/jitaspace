"use client";

import type { AvatarProps } from "@mantine/core";
import { memo, useMemo } from "react";
import { Avatar } from "@mantine/core";

import { EveIconAvatarPlaceholder } from "./EveIconAvatarPlaceholder";

const ICON_FILE_PREFIX = "res:/ui/texture/icons/";

/**
 * Turn an SDE `iconFile` resource path (`res:/ui/texture/icons/2_64_5.png`)
 * into an Image Export Collection URL.
 */
export const eveIconFileUrl = (iconFile?: string | null) =>
  iconFile
    ? `https://iec.jita.space/items/${iconFile.slice(ICON_FILE_PREFIX.length)}`
    : undefined;

export type EveIconAvatarDisplayProps = Omit<AvatarProps, "src"> & {
  /** SDE `iconFile` resource path. Falls back to the placeholder when absent. */
  iconFile?: string | null;
};

/**
 * Presentational half of `EveIconAvatar`: renders an icon whose `iconFile` the
 * caller already has, so it issues no requests of its own. Use this wherever
 * the icon is available server-side (bundled into a Server Component's props)
 * instead of paying for a per-icon SDE lookup on the client.
 */
export const EveIconAvatarDisplay = memo(
  ({ iconFile, ...otherProps }: EveIconAvatarDisplayProps) => {
    const url = useMemo(() => eveIconFileUrl(iconFile), [iconFile]);

    return (
      <Avatar src={url} {...otherProps}>
        <EveIconAvatarPlaceholder {...otherProps} />
      </Avatar>
    );
  },
);
EveIconAvatarDisplay.displayName = "EveIconAvatarDisplay";
