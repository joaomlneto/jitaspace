import React, { memo } from "react";
import Image from "next/image";
import { Indicator, type IndicatorProps } from "@mantine/core";

import ColorTagMinusOrange from "./ColorTagMinusOrange.gif";
import ColorTagMinusRed from "./ColorTagMinusRed.gif";
import ColorTagNeutral from "./ColorTagNeutral.gif";
import ColorTagPlusDarkBlue from "./ColorTagPlusDarkBlue.gif";
import ColorTagPlusLightBlue from "./ColorTagPlusLightBlue.gif";

export type StandingIndicatorProps = IndicatorProps & {
  standing?: number;
};
export const StandingIndicator = memo(
  ({ standing, ...otherProps }: StandingIndicatorProps) => {
    const img =
      standing === undefined
        ? undefined
        : standing > 5
        ? ColorTagPlusDarkBlue
        : standing > 0
        ? ColorTagPlusLightBlue
        : standing == 0
        ? ColorTagNeutral
        : standing >= -5
        ? ColorTagMinusOrange
        : ColorTagMinusRed;

    return (
      <Indicator
        disabled={standing === undefined}
        color="transparent"
        position="bottom-end"
        label={<Image src={img ?? "#"} alt="standing" />}
        {...otherProps}
      />
    );
  },
);
StandingIndicator.displayName = "StandingIndicator";
