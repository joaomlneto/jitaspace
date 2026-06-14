"use client";

import type { IndicatorProps } from "@mantine/core";
import React, { memo } from "react";
import Image from "next/image";
import { Indicator } from "@mantine/core";

import ColorTagMinusOrange from "./ColorTagMinusOrange.gif";
import ColorTagMinusRed from "./ColorTagMinusRed.gif";
import ColorTagNeutral from "./ColorTagNeutral.gif";
import ColorTagPlusDarkBlue from "./ColorTagPlusDarkBlue.gif";
import ColorTagPlusLightBlue from "./ColorTagPlusLightBlue.gif";

export type StandingIndicatorProps = IndicatorProps & {
  standing?: number;
};

function getStandingImage(standing: number | undefined) {
  if (standing === undefined) return undefined;
  if (standing > 5) return ColorTagPlusDarkBlue;
  if (standing > 0) return ColorTagPlusLightBlue;
  if (standing == 0) return ColorTagNeutral;
  if (standing >= -5) return ColorTagMinusOrange;
  return ColorTagMinusRed;
}

export const StandingIndicator = memo(
  ({ standing, ...otherProps }: StandingIndicatorProps) => {
    const img = getStandingImage(standing);

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
