import { memo } from "react";
import { Avatar, type AvatarProps } from "@mantine/core";

import { esiImageSizeClamp, getAvatarSize } from "@jitaspace/utils";

import { sizes } from "./Avatar.styles";


export type EveImageServerAvatarProps = Omit<AvatarProps, "src"> & {
  category?: "alliances" | "corporations" | "characters" | "types";
  id?: string | number | null;
  variation?: string;
};

export const EveImageServerAvatar = memo(
  ({
    category,
    id,
    variation,
    size,
    ...avatarProps
  }: EveImageServerAvatarProps) => {
    const avatarSize = getAvatarSize({
      size: size ?? "md",
      sizes,
    });
    const imageSize = esiImageSizeClamp(avatarSize);

    return (
      <Avatar
        src={
          id && category && variation
            ? `https://images.evetech.net/${category}/${id}/${variation}?size=${imageSize}`
            : undefined
        }
        size={size}
        alt={avatarProps.alt ?? `${category} ${id} ${variation}`}
        {...avatarProps}
      />
    );
  },
);
EveImageServerAvatar.displayName = "EveImageServerAvatar";
