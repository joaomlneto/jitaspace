"use client";

import type { AvatarProps } from "@mantine/core";
import { memo } from "react";

import { EveImageServerAvatar } from "./EveImageServerAvatar";

export type AllianceAvatarProps = Omit<AvatarProps, "src"> & {
  allianceId?: string | number | null;
};

export const AllianceAvatar = memo(
  ({ allianceId, ...otherProps }: AllianceAvatarProps) => {
    return (
      <EveImageServerAvatar
        category="alliances"
        id={allianceId}
        variation="logo"
        size={otherProps.size}
        {...otherProps}
      />
    );
  },
);
AllianceAvatar.displayName = "AllianceAvatar";
