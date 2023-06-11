import { memo } from "react";
import { Avatar, Skeleton, type AvatarProps } from "@mantine/core";

import { esiImageSizeClamp, getAvatarSize } from "@jitaspace/utils";

import { sizes } from "./Avatar.styles";

export type EveImageServerAvatarProps = Omit<AvatarProps, "src"> & {
  category?: string;
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
      <Skeleton
        visible={!id || !variation || !size}
        radius={avatarSize}
        height={avatarSize}
        width={avatarSize}
        circle
      >
        <Avatar
          src={
            id && category && variation
              ? `https://images.evetech.net/${category}/${id}/${variation}?size=${imageSize}`
              : undefined
          }
          size={size}
          radius={size}
          alt={avatarProps.alt ?? `${category} ${id} ${variation}`}
          {...avatarProps}
        />
      </Skeleton>
    );
  },
);
EveImageServerAvatar.displayName = "EveImageServerAvatar";
