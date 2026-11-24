"use client";

import type { AnchorProps } from "@mantine/core";
import type { PropsWithChildren } from "react";
import { memo } from "react";

import { useStargate } from "@jitaspace/hooks";

import { StargateDestinationAnchorDisplay } from "./StargateDestinationAnchorDisplay";

export type StargateDestinationAnchorProps = PropsWithChildren<
  AnchorProps & {
    stargateId?: number;
  }
>;

export const StargateDestinationAnchor = memo(
  ({ stargateId, ...otherProps }: StargateDestinationAnchorProps) => {
    const { data } = useStargate(stargateId);
    return (
      <StargateDestinationAnchorDisplay
        destinationSystemId={data?.destination.solarSystemID}
        {...otherProps}
      />
    );
  },
);
StargateDestinationAnchor.displayName = "StargateDestinationAnchor";
