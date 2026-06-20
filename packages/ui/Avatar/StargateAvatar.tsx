"use client";

import type { AvatarProps } from "@mantine/core";
import { memo } from "react";

import { TypeAvatar } from "./TypeAvatar";

export type StargateAvatarProps = Omit<AvatarProps, "src"> & {
  typeId?: number;
};

export const StargateAvatar = memo(
  ({ typeId, ...otherProps }: StargateAvatarProps) => {
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
StargateAvatar.displayName = "StargateAvatar";
