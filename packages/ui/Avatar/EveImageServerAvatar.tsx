import { memo } from "react";
import { Avatar, type AvatarProps } from "@mantine/core";

import { esiImageSizeClamp, getAvatarSize } from "@jitaspace/utils";

import { sizes } from "./Avatar.styles";

export type EveEntityAvatarProps = Omit<AvatarProps, "src"> & {
  category: string;
  id?: string | number | null;
  variation: string;
};

export const EveImageServerAvatar = memo(
  ({ category, id, variation, size, ...avatarProps }: EveEntityAvatarProps) => {
    const imageSize = esiImageSizeClamp(
      getAvatarSize({
        size: size ?? "md",
        sizes,
      }),
    );

    const src = `https://images.evetech.net/${category}/${id}/${variation}?size=${imageSize}`;
    return (
      <Avatar
        src={id ? src : undefined}
        size={size}
        alt={avatarProps.alt ?? `${category} ${id} ${variation}`}
        {...avatarProps}
      />
    );
  },
);
EveImageServerAvatar.displayName = "EveImageServerAvatar";
