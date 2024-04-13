"use client";

import { memo } from "react";
import { type AvatarProps } from "@mantine/core";

import { useMarketGroup } from "@jitaspace/hooks";

import { EveIconAvatar } from "./EveIconAvatar";


export type MarketGroupAvatarProps = Omit<AvatarProps, "src"> & {
  marketGroupId: number;
};

export const MarketGroupAvatar = memo(
  ({ marketGroupId, ...otherProps }: MarketGroupAvatarProps) => {
    const marketGroup = useMarketGroup(marketGroupId);
    const iconId = marketGroup?.iconID ?? 0;
    return <EveIconAvatar iconId={iconId} {...otherProps} />;
  },
);
MarketGroupAvatar.displayName = "MarketGroupAvatar";
