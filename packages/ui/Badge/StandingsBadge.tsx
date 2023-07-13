import { memo } from "react";
import { Badge, createStyles, Skeleton, type BadgeProps } from "@mantine/core";

const useStyles = createStyles((theme) => ({
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
  orange: {
    color: theme.black,
    backgroundColor: "#b53209",
  },
  red: {
    color: theme.black,
    backgroundColor: "#800007",
  },
}));

export type StandingsBadgeProps = BadgeProps & {
  standing?: number;
};

export const StandingsBadge = memo(
  ({ standing, ...otherProps }: StandingsBadgeProps) => {
    const { classes } = useStyles();

    if (standing === undefined) {
      return (
        <Skeleton>
          <Badge {...otherProps}>xxx</Badge>
        </Skeleton>
      );
    }

    const roundedSecStatus = (Math.round(standing * 10) / 10).toFixed(1);

    const className =
      standing > 5
        ? classes.darkblue
        : standing > 0
        ? classes.lightblue
        : standing == 0
        ? classes.gray
        : standing >= -5
        ? classes.orange
        : classes.red;

    return (
      <Badge className={className} {...otherProps}>
        {roundedSecStatus}
      </Badge>
    );
  },
);
StandingsBadge.displayName = "StandingsBadge";
