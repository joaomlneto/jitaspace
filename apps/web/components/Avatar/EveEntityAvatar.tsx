import { Avatar, type AvatarProps } from "@mantine/core";

import { esiImageSizeClamp } from "~/utils/math";
import { getAvatarSize } from "~/utils/ui";
import { sizes } from "./Avatar.styles";

type Props = Omit<AvatarProps, "src"> & {
  category: string;
  id?: string | number | null;
  variation: string;
};

export default function EveEntityAvatar({
  category,
  id,
  variation,
  size,
  ...avatarProps
}: Props) {
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
}
