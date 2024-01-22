import { memo } from "react";
import { type AvatarProps } from "@mantine/core";

import { EveImageServerAvatar } from "./EveImageServerAvatar";


export type CorporationAvatarProps = Omit<AvatarProps, "src"> & {
  corporationId?: string | number | null;
};

export const CorporationAvatar = memo(
  ({ corporationId, ...otherProps }: CorporationAvatarProps) => {
    return (
      <EveImageServerAvatar
        category="corporations"
        id={corporationId}
        variation="logo"
        size={otherProps.size}
        {...otherProps}
      />
    );
  },
);
CorporationAvatar.displayName = "CorporationAvatar";
