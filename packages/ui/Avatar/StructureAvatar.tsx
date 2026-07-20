"use client";

import type { AvatarProps } from "@mantine/core";
import { memo } from "react";

import { TypeAvatar } from "./TypeAvatar";

export type StructureAvatarProps = Omit<AvatarProps, "src"> & {
  typeId?: number;
};

export const StructureAvatar = memo(
  ({ typeId, ...otherProps }: StructureAvatarProps) => {
    return (
      <TypeAvatar
        typeId={typeId}
        variation="render"
        size={otherProps.size}
        {...otherProps}
      />
    );
  },
);
StructureAvatar.displayName = "StructureAvatar";
