"use client";

import type { BadgeProps } from "@mantine/core";
import { memo } from "react";
import { Badge, Skeleton, useMantineTheme } from "@mantine/core";

export type StandingsBadgeProps = BadgeProps & {
  standing?: number;
};

export const StandingsBadge = memo(
  ({ standing, ...otherProps }: StandingsBadgeProps) => {
    const theme = useMantineTheme();
    const classes = {
      darkblue: {
        backgroundColor: "#051468",
      },
      lightblue: {
        backgroundColor: "#224fb7",
      },
      gray: {
        color: theme.black,
        backgroundColor: "#808080",
      },
      // No `color` override on these two: both are dark enough that the
      // badge's default light text clears WCAG AA, where black did not.
      orange: {
        backgroundColor: "#b53209",
      },
      red: {
        backgroundColor: "#800007",
      },
    };

    if (standing === undefined) {
      return (
        <Skeleton>
          <Badge {...otherProps}>xxx</Badge>
        </Skeleton>
      );
    }

    const roundedSecStatus = (Math.round(standing * 10) / 10).toFixed(1);

    let className: (typeof classes)[keyof typeof classes];
    if (standing > 5) {
      className = classes.darkblue;
    } else if (standing > 0) {
      className = classes.lightblue;
    } else if (standing == 0) {
      className = classes.gray;
    } else if (standing >= -5) {
      className = classes.orange;
    } else {
      className = classes.red;
    }

    return (
      <Badge style={className} {...otherProps}>
        {roundedSecStatus}
      </Badge>
    );
  },
);
StandingsBadge.displayName = "StandingsBadge";
