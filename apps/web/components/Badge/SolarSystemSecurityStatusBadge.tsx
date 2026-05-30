"use client";

import { memo } from "react";
import { type BadgeProps } from "@mantine/core";
import { useSolarSystem } from "@jitaspace/hooks";
import { SolarSystemSecurityStatusBadge as UISolarSystemSecurityStatusBadge } from "@jitaspace/ui";

export type SolarSystemSecurityStatusBadgeProps = BadgeProps & {
  solarSystemId?: number;
};

export const SolarSystemSecurityStatusBadge = memo(({ solarSystemId, ...otherProps }: SolarSystemSecurityStatusBadgeProps) => {
  const { data } = useSolarSystem(solarSystemId ?? 0);
  return (
    <UISolarSystemSecurityStatusBadge
      securityStatus={data?.data.security_status}
      {...otherProps}
    />
  );
});
SolarSystemSecurityStatusBadge.displayName = "SolarSystemSecurityStatusBadge";
