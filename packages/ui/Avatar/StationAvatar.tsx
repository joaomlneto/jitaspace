"use client";

import type { AvatarProps } from "@mantine/core";
import { memo } from "react";

import { TypeAvatar } from "./TypeAvatar";

export type StationAvatarProps = Omit<AvatarProps, "src"> & {
  typeId?: number;
};

export const StationAvatar = memo(
  ({ typeId, ...otherProps }: StationAvatarProps) => {
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
StationAvatar.displayName = "StationAvatar";
