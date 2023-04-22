import { type AvatarProps } from "@mantine/core";

import { EveEntityAvatar } from "./EveEntityAvatar";

type Props = Omit<AvatarProps, "src"> & {
  typeId?: string;
  variation?: string;
};

export function TypeAvatar({ typeId, variation, ...otherProps }: Props) {
  return (
    <EveEntityAvatar
      category="types"
      id={typeId}
      variation={variation ?? "render"}
      size={otherProps.size}
      {...otherProps}
    />
  );
}
