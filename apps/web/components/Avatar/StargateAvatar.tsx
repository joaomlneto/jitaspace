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
    const { data } = useStargate(stargateId ?? 0);
    return <UIStargateAvatar typeId={data?.data.type_id} {...otherProps} />;
  },
);
StargateAvatar.displayName = "StargateAvatar";
