"use client";

import type { AvatarProps } from "@mantine/core";
import { memo } from "react";

import { useStargate } from "@jitaspace/hooks";
import { StargateAvatar as UIStargateAvatar } from "@jitaspace/ui";

export type StargateAvatarProps = Omit<AvatarProps, "src"> & {
  stargateId?: number;
};

export const StargateAvatar = memo(
  ({ stargateId, ...otherProps }: StargateAvatarProps) => {
    const { data } = useStargate(stargateId);
    return <UIStargateAvatar typeId={data?.typeID} {...otherProps} />;
  },
);
StargateAvatar.displayName = "StargateAvatar";
