"use client";

import type { BadgeProps } from "@mantine/core";
import { memo } from "react";

import { useSolarSystem } from "@jitaspace/hooks";
import { SolarSystemSecurityStatusBadge as UISolarSystemSecurityStatusBadge } from "@jitaspace/ui";

export type SolarSystemSecurityStatusBadgeProps = BadgeProps & {
  solarSystemId?: number;
};

export const SolarSystemSecurityStatusBadge = memo(
  ({ solarSystemId, ...otherProps }: SolarSystemSecurityStatusBadgeProps) => {
    const { data } = useSolarSystem(solarSystemId);
    return (
      <UISolarSystemSecurityStatusBadge
        securityStatus={data?.securityStatus}
        {...otherProps}
      />
    );
  },
);
SolarSystemSecurityStatusBadge.displayName = "SolarSystemSecurityStatusBadge";
