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

    /**
     * Every tier pins BOTH its background and its text colour, and the badge
     * forces `variant="filled"`.
     *
     * Relying on the variant's own text colour is not safe here: the app themes
     * set `Badge.extend({ defaultProps: { variant: "outline" } })`, under which
     * the text becomes the theme accent while these backgrounds stay forced —
     * amber on dark red, well below WCAG AA. Pinning both makes a standings
     * badge read the same under every theme, the way
     * SolarSystemSecurityStatusBadge already does.
     *
     * Ratios against WCAG AA's 4.5:1 for normal text, asserted in the tests:
     *   #051468 / white 16.1:1   #224fb7 / white 7.3:1
     *   #808080 / black  5.3:1   (white would be 3.9:1 — black is the better pick)
     *   #b53209 / white  6.1:1   #800007 / white 10.9:1
     */
    const tiers = {
      darkblue: { color: theme.white, backgroundColor: "#051468" },
      lightblue: { color: theme.white, backgroundColor: "#224fb7" },
      gray: { color: theme.black, backgroundColor: "#808080" },
      orange: { color: theme.white, backgroundColor: "#b53209" },
      red: { color: theme.white, backgroundColor: "#800007" },
    };

    if (standing === undefined) {
      return (
        <Skeleton>
          <Badge {...otherProps}>xxx</Badge>
        </Skeleton>
      );
    }

    const roundedStanding = (Math.round(standing * 10) / 10).toFixed(1);

    let tier: (typeof tiers)[keyof typeof tiers];
    if (standing > 5) {
      tier = tiers.darkblue;
    } else if (standing > 0) {
      tier = tiers.lightblue;
    } else if (standing == 0) {
      tier = tiers.gray;
    } else if (standing >= -5) {
      tier = tiers.orange;
    } else {
      tier = tiers.red;
    }

    return (
      <Badge variant="filled" style={tier} {...otherProps}>
        {roundedStanding}
      </Badge>
    );
  },
);
StandingsBadge.displayName = "StandingsBadge";
