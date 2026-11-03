"use client";

import type { BadgeProps } from "@mantine/core";
import { memo } from "react";
import { Badge, Skeleton, useMantineTheme } from "@mantine/core";

import {
  formatSecurityStatus,
  isLightSecurityStatus,
  securityStatusColor,
} from "./securityStatus";

export type SolarSystemSecurityStatusBadgeProps = BadgeProps & {
  securityStatus?: number;
};

export const SolarSystemSecurityStatusBadge = memo(
  ({ securityStatus, ...otherProps }: SolarSystemSecurityStatusBadgeProps) => {
    const theme = useMantineTheme();

    if (securityStatus === undefined) {
      return (
        <Skeleton>
          <Badge variant="filled" {...otherProps}>
            0.0
          </Badge>
        </Skeleton>
      );
    }

    return (
      <Badge
        variant="filled"
        style={{
          backgroundColor: securityStatusColor(securityStatus),
          // Its own text colour too: the background is set here, so the
          // theme cannot pick a text colour that suits it.
          color: isLightSecurityStatus(securityStatus)
            ? theme.black
            : theme.white,
        }}
        {...otherProps}
      >
        {formatSecurityStatus(securityStatus)}
      </Badge>
    );
  },
);
SolarSystemSecurityStatusBadge.displayName = "SolarSystemSecurityStatusBadge";
