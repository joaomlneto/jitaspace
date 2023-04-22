import { type AvatarProps } from "@mantine/core";

import { EveEntityAvatar } from "./EveEntityAvatar";

export type CorporationAvatarProps = Omit<AvatarProps, "src"> & {
  corporationId?: string | number | null;
};

export function CorporationAvatar({
  corporationId,
  ...otherProps
}: CorporationAvatarProps) {
  return (
    <EveEntityAvatar
      category="corporations"
      id={`${corporationId}`}
      variation="logo"
      size={otherProps.size}
      {...otherProps}
    />
  );
}
