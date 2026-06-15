"use client";

import type { PropsWithChildren } from "react";
import React, { memo } from "react";
import { type AnchorProps } from "@mantine/core";
import { useStargate } from "@jitaspace/hooks";
import { StargateDestinationAnchor as UIStargateDestinationAnchor } from "@jitaspace/ui";

export type StargateDestinationAnchorProps = PropsWithChildren<
  AnchorProps & {
    stargateId?: number;
  }
>;

export const StargateDestinationAnchor = memo(({ stargateId, ...otherProps }: StargateDestinationAnchorProps) => {
  const { data } = useStargate(stargateId ?? 0);
  return (
    <UIStargateDestinationAnchor
      destinationSystemId={data?.data.destination?.system_id}
      {...otherProps}
    />
  );
});
StargateDestinationAnchor.displayName = "StargateDestinationAnchor";
