import { memo } from "react";
import { type AvatarProps } from "@mantine/core";

import { EveImageServerAvatar } from "./EveImageServerAvatar";

export type TypeAvatarProps = Omit<AvatarProps, "src"> & {
  typeId?: string | number;
  variation?: string;
};

export const TypeAvatar = memo(
  ({ typeId, variation, ...otherProps }: TypeAvatarProps) => {
    return (
      <EveImageServerAvatar
        category="types"
        id={typeId}
        variation={variation ?? "render"}
        size={otherProps.size}
        {...otherProps}
      />
    );
  },
);
TypeAvatar.displayName = "TypeAvatar";
