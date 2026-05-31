"use client";

import { memo } from "react";
import { type AvatarProps } from "@mantine/core";

import { TypeAvatar } from "./TypeAvatar";

export type StarAvatarProps = Omit<AvatarProps, "src"> & {
  typeId?: number;
};

export const StarAvatar = memo(({ typeId, ...otherProps }: StarAvatarProps) => {
  return (
    <TypeAvatar
      typeId={typeId}
      variation="render"
      size={otherProps.size}
      {...otherProps}
    />
  );
});
StarAvatar.displayName = "StarAvatar";
