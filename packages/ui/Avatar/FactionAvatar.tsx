import { memo } from "react";
import { type AvatarProps } from "@mantine/core";

import { EveImageServerAvatar } from "./EveImageServerAvatar";

export type FactionAvatarProps = Omit<AvatarProps, "src"> & {
  factionId?: string | number | null;
};

export const FactionAvatar = memo(
  ({ factionId, ...otherProps }: FactionAvatarProps) => {
    return (
      <EveImageServerAvatar
        category="corporations"
        id={`${factionId}`}
        variation="logo"
        size={otherProps.size}
        {...otherProps}
      />
    );
  },
);
FactionAvatar.displayName = "FactionAvatar";
