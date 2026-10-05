import type { BadgeProps } from "@mantine/core";
import { memo } from "react";
import { Badge } from "@mantine/core";
import clsx from "clsx";

import { getCorporationTickerFill } from "./corporationPalette";
import classes from "./CorporationPalette.module.css";

export type CorporationTickerPaletteBadgeProps = BadgeProps & {
  ticker: string;
  /** The corporation's palette colours; the default badge when empty. */
  colors?: readonly string[];
};

/**
 * A ticker badge filled with the corporation's main colour blending slightly
 * towards its secondary, with text picked for contrast. Inside an element
 * carrying `useCorporationPaletteVars`, it gains a hairline edge wherever its
 * colour falls below 3:1 against the surface behind it.
 */
export const CorporationTickerPaletteBadge = memo(
  ({
    ticker,
    colors = [],
    className,
    style,
    ...otherProps
  }: CorporationTickerPaletteBadgeProps) => {
    const fill = getCorporationTickerFill(colors);
    return (
      <Badge
        className={clsx(fill && classes.tickerEdge, className)}
        style={[
          fill
            ? {
                // The solid main colour shows wherever OKLab gradients are
                // unsupported, so the picked text colour still sits on it.
                backgroundColor: fill.fallback,
                backgroundImage: fill.background,
                color: fill.color,
                flexShrink: 0,
              }
            : { flexShrink: 0 },
          style,
        ]}
        {...otherProps}
      >
        {ticker}
      </Badge>
    );
  },
);
CorporationTickerPaletteBadge.displayName = "CorporationTickerPaletteBadge";
