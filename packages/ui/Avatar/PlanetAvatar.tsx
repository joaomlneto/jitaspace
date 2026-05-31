"use client";

import { memo } from "react";
import { type AvatarProps } from "@mantine/core";

import { TypeAvatar } from "./TypeAvatar";

export type PlanetAvatarProps = Omit<AvatarProps, "src"> & {
  typeId?: number;
};

export const PlanetAvatar = memo(
  ({ typeId, ...otherProps }: PlanetAvatarProps) => {
    return (
      <TypeAvatar
        typeId={typeId}
        variation="icon"
        size={otherProps.size}
        {...otherProps}
      />
    );
  },
);
PlanetAvatar.displayName = "PlanetAvatar";
