"use client";

import type { BadgeProps } from "@mantine/core";
import { memo } from "react";
import { Badge, Skeleton, useMantineTheme } from "@mantine/core";

export type SolarSystemSecurityStatusBadgeProps = BadgeProps & {
  securityStatus?: number;
};

export const SolarSystemSecurityStatusBadge = memo(
  ({ securityStatus, ...otherProps }: SolarSystemSecurityStatusBadgeProps) => {
    const theme = useMantineTheme();
    const classes = {
      "1.0": {
        backgroundColor: "#4072D9",
      },
      "0.9": {
        backgroundColor: "#5597E3",
      },
      "0.8": {
        color: theme.black,
        backgroundColor: "#72C9F2",
      },
      "0.7": {
        color: theme.black,
        backgroundColor: "#81D7A7",
      },
      "0.6": {
        color: theme.black,
        backgroundColor: "#8FE269",
      },
      "0.5": {
        color: theme.black,
        backgroundColor: "#F5FD93",
      },
      "0.4": {
        backgroundColor: "#CC722C",
      },
      "0.3": {
        backgroundColor: "#BE4E26",
      },
      "0.2": {
        backgroundColor: "#AB2923",
      },
      "0.1": {
        backgroundColor: "#692623",
      },
      "0.0": {
        backgroundColor: "#813861",
      },
      "-0.0": {
        backgroundColor: "#813861",
      },
    };

    if (securityStatus === undefined) {
      return (
        <Skeleton>
          <Badge variant="filled" {...otherProps}>
            0.0
          </Badge>
        </Skeleton>
      );
    }

    const roundedSecStatus = (
      Math.round(Math.max(securityStatus, 0) * 10) / 10
    ).toFixed(1) as keyof typeof classes;

    return (
      <Badge variant="filled" style={classes[roundedSecStatus]} {...otherProps}>
        {roundedSecStatus}
      </Badge>
    );
  },
);
SolarSystemSecurityStatusBadge.displayName = "SolarSystemSecurityStatusBadge";
