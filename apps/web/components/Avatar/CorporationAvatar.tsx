import { type AvatarProps } from "@mantine/core";

import EveEntityAvatar from "./EveEntityAvatar";

type Props = Omit<AvatarProps, "src"> & {
  corporationId?: string | number | null;
};

export default function CorporationAvatar({
  corporationId,
  ...otherProps
}: Props) {
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
