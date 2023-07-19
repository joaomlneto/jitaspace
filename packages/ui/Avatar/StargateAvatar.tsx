import React, { memo } from "react";
import { type AvatarProps } from "@mantine/core";

import { useGetUniverseStargatesStargateId } from "@jitaspace/esi-client";

import { TypeAvatar } from "./TypeAvatar";

export type StargateAvatarProps = Omit<AvatarProps, "src"> & {
  stargateId?: string | number | null;
};

export const StargateAvatar = memo(
  ({ stargateId, ...otherProps }: StargateAvatarProps) => {
    const { data } = useGetUniverseStargatesStargateId(
      typeof stargateId === "string" ? parseInt(stargateId) : stargateId ?? 1,
      {},
      {
        swr: {
          enabled: !!stargateId,
        },
      },
    );

    return (
      <TypeAvatar
        typeId={data?.data.type_id}
        variation="render"
        size={otherProps.size}
        {...otherProps}
      />
    );
  },
);
StargateAvatar.displayName = "StargateAvatar";
