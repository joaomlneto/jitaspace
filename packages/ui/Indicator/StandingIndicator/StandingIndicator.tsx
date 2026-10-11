// The `.gif` imports below need Next's static-image module declarations. Apps
// get them from the generated `next-env.d.ts`, but packages do not — and since
// this package ships TypeScript source, consumers compile this file in *their*
// program too. Referencing the types here lets the declarations travel with
// the import graph, so every consumer is covered. Triple-slash directives only
// count before the first statement, so this sits above "use client".
/// <reference types="next/image-types/global" />
"use client";

import type { IndicatorProps } from "@mantine/core";
import { memo } from "react";
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
