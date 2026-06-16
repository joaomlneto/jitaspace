"use client";

import type { AvatarProps } from "@mantine/core";
import { memo } from "react";

import { TypeAvatar } from "./TypeAvatar";

export type SolarSystemAvatarProps = Omit<AvatarProps, "src"> & {
  typeId?: number;
};

export const SolarSystemStarAvatar = memo(
  ({ typeId, ...otherProps }: SolarSystemAvatarProps) => {
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
SolarSystemStarAvatar.displayName = "SolarSystemAvatar";
