"use client";

import type { AnchorProps } from "@mantine/core";
import type { PropsWithChildren } from "react";
import { memo } from "react";

import { StargateDestinationAnchor as UIStargateDestinationAnchor } from "@jitaspace/eve-components";
import { useStargate } from "@jitaspace/hooks";

export type StargateDestinationAnchorProps = PropsWithChildren<
  AnchorProps & {
    stargateId?: number;
  }
>;

export const StargateDestinationAnchor = memo(
  ({ stargateId, ...otherProps }: StargateDestinationAnchorProps) => {
    const { data } = useStargate(stargateId ?? 0);
    // The generated stargate type marks `destination` as always present, but
    // the API (and tests) can omit it, so treat it as optional at runtime.
    const destination = data?.data.destination as
      | { system_id: number }
      | undefined;
    return (
      <UIStargateDestinationAnchor
        destinationSystemId={destination?.system_id}
        {...otherProps}
      />
    );
  },
);
StargateDestinationAnchor.displayName = "StargateDestinationAnchor";
